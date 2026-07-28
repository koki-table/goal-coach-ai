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
import { mapMilestoneToResponse } from "../../milestones/helpers/milestoneMapper.helper";
import { mapTodoToResponse } from "../../todos/helpers/todoMapper.helper";
import type { CoachChatPromptMessage } from "../helpers/coachChatPrompt.helper";
import { buildChatUserPrompt } from "../helpers/coachChatPrompt.helper";
import type { PlanProposalPayload } from "../helpers/coachProposal.helper";
import { toPromptMessage, toProposalPayload } from "../helpers/coachProposal.helper";
import { buildGoalSnapshot } from "../helpers/goalSnapshot.helper";
import { chat, createCoachModel } from "../lib/coachModel";
import { getChatSystemInstruction } from "../prompts/coachPrompts";

export type AdoptPlanItemTarget = { type: "milestone" } | { type: "todo"; todoIndex: number };

export class CoachChatService {
	// プロンプトに渡す直近履歴の件数
	private static readonly CHAT_HISTORY_LIMIT = 20;
	// 24時間あたりのユーザーメッセージ上限
	private static readonly CHAT_DAILY_MESSAGE_LIMIT = 50;
	private static readonly RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
	// メッセージ取得のページサイズ方針（コントローラではなくドメインが持つ）
	private static readonly DEFAULT_MESSAGE_PAGE_SIZE = 30;
	private static readonly MIN_MESSAGE_PAGE_SIZE = 1;
	private static readonly MAX_MESSAGE_PAGE_SIZE = 100;

	private conversationRepo: CoachConversationRepository;
	private messageRepo: CoachMessageRepository;
	private goalRepo: GoalRepository;
	private milestoneRepo: MilestoneRepository;
	private todoRepo: TodoRepository;
	private todoLogRepo: TodoLogRepository;

	constructor(private db: Database) {
		this.conversationRepo = new CoachConversationRepository(db);
		this.messageRepo = new CoachMessageRepository(db);
		this.goalRepo = new GoalRepository(db);
		this.milestoneRepo = new MilestoneRepository(db);
		this.todoRepo = new TodoRepository(db);
		this.todoLogRepo = new TodoLogRepository(db);
	}

	async startOrGetConversation(userId: string, goalId: string) {
		const existing = await this.conversationRepo.findByGoalId(userId, goalId);
		if (existing) return existing;

		const goal = await this.goalRepo.findByIdAndUserId(goalId, userId);
		if (!goal) {
			throw new GoalNotFoundError(goalId);
		}

		try {
			return await this.conversationRepo.create({
				userId,
				goalId,
				goalTitleSnapshot: goal.title,
				goalDeadlineSnapshot: goal.dueDate ?? undefined,
			});
		} catch (e) {
			// (userId, goalId) のunique制約により、並行リクエストで先に作られていた場合は
			// insertが失敗する。その場合は既存スレッドを返し「goalごとに1スレッド」を保つ。
			const raced = await this.conversationRepo.findByGoalId(userId, goalId);
			if (raced) return raced;
			throw e;
		}
	}

	async sendMessage(userId: string, conversationId: string, content: string, env: Bindings) {
		if (!env.GEMINI_API_KEY) {
			throw new CoachNotConfiguredError();
		}

		const conversation = await this.conversationRepo.findByIdAndUserId(conversationId, userId);
		if (!conversation) {
			throw new CoachConversationNotFoundError(conversationId);
		}

		const since = new Date(Date.now() - CoachChatService.RATE_LIMIT_WINDOW_MS).toISOString();
		const recentCount = await this.messageRepo.countUserMessagesByUserIdSince(userId, since);
		if (recentCount >= CoachChatService.CHAT_DAILY_MESSAGE_LIMIT) {
			throw new CoachChatRateLimitError(userId);
		}

		// ユーザーメッセージはまだ永続化しない。LLM呼び出しが失敗しても孤立したuser行が
		// 残らないよう、履歴には今回の発言をインメモリで追加してプロンプトを組む。
		const recentMessages = await this.messageRepo.findRecentByConversationId(
			conversationId,
			CoachChatService.CHAT_HISTORY_LIMIT,
		);
		const history: CoachChatPromptMessage[] = [
			...recentMessages.map(toPromptMessage),
			{ role: "user", content },
		];

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

		// LLM成功後にuser・assistantの2メッセージとupdatedAt更新をアトミックに書き込む。
		const [, [assistantMessage]] = await this.db.batch([
			this.messageRepo.insertStmt({ conversationId, role: "user", content }),
			this.messageRepo
				.insertStmt({
					conversationId,
					role: "assistant",
					content: result.reply,
					proposal: proposal ? JSON.stringify(proposal) : null,
				})
				.returning(),
			this.conversationRepo.touchStmt(conversationId),
		]);

		return assistantMessage;
	}

	async getMessages(
		userId: string,
		conversationId: string,
		cursor: number | undefined,
		limit: number | undefined,
	) {
		const conversation = await this.conversationRepo.findByIdAndUserId(conversationId, userId);
		if (!conversation) {
			throw new CoachConversationNotFoundError(conversationId);
		}
		return this.messageRepo.findPageByConversationId(
			conversationId,
			cursor,
			CoachChatService.clampPageSize(limit),
		);
	}

	// ページサイズの正規化。不正値/未指定は既定にフォールバックし、MIN〜MAXにクランプする
	private static clampPageSize(limit: number | undefined): number {
		if (limit === undefined || !Number.isFinite(limit)) {
			return CoachChatService.DEFAULT_MESSAGE_PAGE_SIZE;
		}
		return Math.min(
			Math.max(Math.trunc(limit), CoachChatService.MIN_MESSAGE_PAGE_SIZE),
			CoachChatService.MAX_MESSAGE_PAGE_SIZE,
		);
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

			// idを先に採番することで、milestone作成とproposal更新を1つのbatchで
			// アトミックに実行できる。片方だけ成功して二重採用が起きる状態を防ぐ。
			// sortOrderの採番ルールは共有リポジトリに委譲し、coachにドメインロジックを持ち込まない。
			const milestoneId = crypto.randomUUID();
			const sortOrder = await this.milestoneRepo.nextSortOrder(goalId);
			proposal.milestone = {
				...proposal.milestone,
				adopted: true,
				createdMilestoneId: milestoneId,
			};

			const [[createdMilestone]] = await this.db.batch([
				this.milestoneRepo
					.insertStmt({
						id: milestoneId,
						goalId,
						title: proposal.milestone.title,
						sortOrder,
						// 提案の定量目標を引き継ぐ。現在値は0開始（採用後に＋更新で進捗を入れる）
						targetValue: proposal.milestone.targetValue,
						unit: proposal.milestone.unit,
					})
					.returning(),
				this.messageRepo.updateProposalStmt(messageId, JSON.stringify(proposal)),
			]);

			return { proposal, milestone: mapMilestoneToResponse(createdMilestone) };
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

		const todoId = crypto.randomUUID();
		const milestoneId = proposal.milestone?.createdMilestoneId;
		proposal.todos[target.todoIndex] = { ...targetTodo, adopted: true, createdTodoId: todoId };

		const [[createdTodo]] = await this.db.batch([
			this.todoRepo
				.insertStmt({
					id: todoId,
					goalId,
					title: targetTodo.title,
					taskType: targetTodo.taskType,
					milestoneId,
					isAiGenerated: 1,
				})
				.returning(),
			this.messageRepo.updateProposalStmt(messageId, JSON.stringify(proposal)),
		]);

		return { proposal, todo: mapTodoToResponse(createdTodo, 0) };
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
