import {
	CoachChatRateLimitError,
	CoachConversationNotFoundError,
	CoachNotConfiguredError,
	GoalNotFoundError,
	MilestoneNotAdoptedYetError,
	PlanItemAlreadyAdoptedError,
	PlanItemNotFoundError,
} from "../../../common/errors";
import { CoachConversationRepository } from "../../../common/repositories/coachConversationRepository";
import { CoachMessageRepository } from "../../../common/repositories/coachMessageRepository";
import { GoalRepository } from "../../../common/repositories/goalRepository";
import { MilestoneRepository } from "../../../common/repositories/milestoneRepository";
import { TodoLogRepository } from "../../../common/repositories/todoLogRepository";
import { TodoRepository } from "../../../common/repositories/todoRepository";
import type { Database } from "../../../db";
import type { Bindings } from "../../../types/env";
import { MilestoneService } from "../../milestones/services/milestoneService";
import { TodoService } from "../../todos/services/todoService";
import type { CoachChatPromptMessage } from "../helpers/coachChatPrompt.helper";
import { buildChatUserPrompt } from "../helpers/coachChatPrompt.helper";
import { buildGoalSnapshot } from "../helpers/goalSnapshot.helper";
import { chat, createCoachModel } from "../lib/coachModel";
import { getChatSystemInstruction } from "../prompts/coachPrompts";
import type { PlanProposal } from "../prompts/coachPrompts";

const CHAT_HISTORY_LIMIT = 20;
const CHAT_DAILY_MESSAGE_LIMIT = 50;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

type PlanProposalPayload = {
	milestone: { title: string; adopted: boolean; createdMilestoneId?: string } | null;
	todos: { title: string; taskType: "daily" | "once"; adopted: boolean; createdTodoId?: string }[];
};

export type AdoptPlanItemTarget = { type: "milestone" } | { type: "todo"; todoIndex: number };

export class CoachChatService {
	private conversationRepo: CoachConversationRepository;
	private messageRepo: CoachMessageRepository;
	private goalRepo: GoalRepository;
	private milestoneRepo: MilestoneRepository;
	private todoRepo: TodoRepository;
	private todoLogRepo: TodoLogRepository;
	private milestoneService: MilestoneService;
	private todoService: TodoService;

	constructor(private db: Database) {
		this.conversationRepo = new CoachConversationRepository(db);
		this.messageRepo = new CoachMessageRepository(db);
		this.goalRepo = new GoalRepository(db);
		this.milestoneRepo = new MilestoneRepository(db);
		this.todoRepo = new TodoRepository(db);
		this.todoLogRepo = new TodoLogRepository(db);
		this.milestoneService = new MilestoneService(db);
		this.todoService = new TodoService(db);
	}

	async startOrGetConversation(userId: string, goalId: string) {
		const existing = await this.conversationRepo.findByGoalId(userId, goalId);
		if (existing) return existing;

		const goal = await this.goalRepo.findByIdAndUserId(goalId, userId);
		if (!goal) {
			throw new GoalNotFoundError(goalId);
		}

		return this.conversationRepo.create({
			userId,
			goalId,
			goalTitleSnapshot: goal.title,
			goalDeadlineSnapshot: goal.dueDate ?? undefined,
		});
	}

	async sendMessage(userId: string, conversationId: string, content: string, env: Bindings) {
		if (!env.GEMINI_API_KEY) {
			throw new CoachNotConfiguredError();
		}

		const conversation = await this.conversationRepo.findByIdAndUserId(conversationId, userId);
		if (!conversation) {
			throw new CoachConversationNotFoundError(conversationId);
		}

		const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
		const recentCount = await this.messageRepo.countUserMessagesByUserIdSince(userId, since);
		if (recentCount >= CHAT_DAILY_MESSAGE_LIMIT) {
			throw new CoachChatRateLimitError(userId);
		}

		await this.messageRepo.create({ conversationId, role: "user", content });

		const recentMessages = await this.messageRepo.findRecentByConversationId(
			conversationId,
			CHAT_HISTORY_LIMIT,
		);
		const history = recentMessages.map(toPromptMessage);

		const goal = conversation.goalId
			? await this.goalRepo.findByIdAndUserId(conversation.goalId, userId)
			: undefined;

		const { prompt, existingMilestoneTitles } =
			conversation.goalId && goal
				? await this.buildLivingGoalPrompt(goal, history)
				: {
						prompt: buildChatUserPrompt({
							goalTitle: conversation.goalTitleSnapshot,
							goalDeadline: conversation.goalDeadlineSnapshot,
							goalDeleted: true,
							history,
						}),
						existingMilestoneTitles: [] as string[],
					};

		const model = createCoachModel(env);
		const result = await chat({
			model,
			system: getChatSystemInstruction("calmMentor"),
			prompt,
		});

		const proposal: PlanProposalPayload | null = result.planProposal
			? toProposalPayload(result.planProposal, existingMilestoneTitles)
			: null;

		const assistantMessage = await this.messageRepo.create({
			conversationId,
			role: "assistant",
			content: result.reply,
			proposal: proposal ? JSON.stringify(proposal) : null,
		});

		await this.conversationRepo.touchUpdatedAt(conversationId);

		return assistantMessage;
	}

	async getMessages(
		userId: string,
		conversationId: string,
		cursor: number | undefined,
		limit: number,
	) {
		const conversation = await this.conversationRepo.findByIdAndUserId(conversationId, userId);
		if (!conversation) {
			throw new CoachConversationNotFoundError(conversationId);
		}
		return this.messageRepo.findPageByConversationId(conversationId, cursor, limit);
	}

	async adoptPlanItem(userId: string, messageId: number, target: AdoptPlanItemTarget) {
		const message = await this.messageRepo.findById(messageId);
		if (!message || !message.proposal) {
			throw new PlanItemNotFoundError(messageId);
		}

		const conversation = await this.conversationRepo.findByIdAndUserId(
			message.conversationId,
			userId,
		);
		if (!conversation || !conversation.goalId) {
			throw new CoachConversationNotFoundError(message.conversationId);
		}

		const proposal = JSON.parse(message.proposal) as PlanProposalPayload;
		const goalId = conversation.goalId;

		if (target.type === "milestone") {
			if (!proposal.milestone) {
				throw new PlanItemNotFoundError(messageId);
			}
			if (proposal.milestone.adopted) {
				throw new PlanItemAlreadyAdoptedError(messageId);
			}

			const created = await this.milestoneService.createOne(
				userId,
				goalId,
				proposal.milestone.title,
			);

			proposal.milestone = { ...proposal.milestone, adopted: true, createdMilestoneId: created.id };
			await this.messageRepo.updateProposal(messageId, JSON.stringify(proposal));

			return { proposal, milestone: created };
		}

		const targetTodo = proposal.todos[target.todoIndex];
		if (!targetTodo) {
			throw new PlanItemNotFoundError(messageId);
		}
		if (targetTodo.adopted) {
			throw new PlanItemAlreadyAdoptedError(messageId);
		}
		if (proposal.milestone && !proposal.milestone.adopted) {
			throw new MilestoneNotAdoptedYetError(messageId);
		}

		const milestoneId = proposal.milestone?.createdMilestoneId;
		const created = await this.todoService.create(userId, goalId, {
			title: targetTodo.title,
			taskType: targetTodo.taskType,
			milestoneId,
			isAiGenerated: true,
		});

		proposal.todos[target.todoIndex] = {
			...targetTodo,
			adopted: true,
			createdTodoId: created.id,
		};
		await this.messageRepo.updateProposal(messageId, JSON.stringify(proposal));

		return { proposal, todo: created };
	}

	private async buildLivingGoalPrompt(
		goal: { title: string; dueDate: string | null; id: string },
		history: CoachChatPromptMessage[],
	): Promise<{ prompt: string; existingMilestoneTitles: string[] }> {
		const [milestones, todos] = await Promise.all([
			this.milestoneRepo.findAllByGoalId(goal.id),
			this.todoRepo.findAllByGoalId(goal.id),
		]);
		const todoLogs = await this.todoLogRepo.findAllByTodoIds(todos.map((t) => t.id));

		const snapshot = buildGoalSnapshot(todos, milestones, todoLogs, new Date());

		const prompt = buildChatUserPrompt({
			goalTitle: goal.title,
			goalDeadline: goal.dueDate,
			goalDeleted: false,
			snapshot,
			milestones: milestones.map((m) => ({ title: m.title, isCompleted: m.isCompleted === 1 })),
			history,
		});

		return { prompt, existingMilestoneTitles: milestones.map((m) => m.title) };
	}
}

// メッセージ履歴をプロンプト用の形式に変換する。assistantメッセージのproposalは
// AIが既提案・採用済み項目を認識し重複提案を避けられるよう、採用状態を明示した形で渡す。
function toPromptMessage(message: {
	role: string;
	content: string;
	proposal: string | null;
}): CoachChatPromptMessage {
	const role = message.role === "user" ? "user" : "assistant";
	if (!message.proposal) {
		return { role, content: message.content };
	}

	const parsed = JSON.parse(message.proposal) as PlanProposalPayload;
	return {
		role,
		content: message.content,
		proposal: {
			milestone: parsed.milestone
				? { title: parsed.milestone.title, adopted: parsed.milestone.adopted }
				: null,
			todos: parsed.todos.map((t) => ({ title: t.title, adopted: t.adopted })),
		},
	};
}

// プロンプトの指示だけに頼らず、既存マイルストーンと完全一致するタイトルが返ってきた場合は
// サーバー側で確実に除外する(会話履歴のウィンドウ外でも重複作成を防ぐ安全策)。
function toProposalPayload(
	planProposal: PlanProposal,
	existingMilestoneTitles: string[],
): PlanProposalPayload {
	const isDuplicateMilestone =
		planProposal.milestoneTitle !== null &&
		existingMilestoneTitles.some((title) => title.trim() === planProposal.milestoneTitle?.trim());

	return {
		milestone:
			planProposal.milestoneTitle && !isDuplicateMilestone
				? { title: planProposal.milestoneTitle, adopted: false }
				: null,
		todos: planProposal.todos.map((t) => ({
			title: t.title,
			taskType: t.taskType,
			adopted: false,
		})),
	};
}
