import {
	CoachChatRateLimitError,
	CoachConversationNotFoundError,
	CoachNotConfiguredError,
	ExplorationThreadAlreadyLinkedError,
	GoalLimitExceededError,
	GoalNotFoundError,
	MilestoneNotAdoptedYetError,
	ObjectiveAlreadyAdoptedError,
	PlanItemAlreadyAdoptedError,
	PlanItemNotFoundError,
} from "../../../common/errors";
import { getCategoryNameFromKey } from "../../../common/helpers/categoryMapping.helper";
import { resolveCategoryId } from "../../../common/helpers/categoryResolution.helper";
import { MAX_ACTIVE_GOALS } from "../../../common/helpers/goalLimit.helper";
import { CoachConversationRepository } from "../../../common/repositories/coachConversationRepository";
import { CoachMessageRepository } from "../../../common/repositories/coachMessageRepository";
import { GoalCategoryRepository } from "../../../common/repositories/goalCategoryRepository";
import { GoalRepository } from "../../../common/repositories/goalRepository";
import { MilestoneRepository } from "../../../common/repositories/milestoneRepository";
import { TodoLogRepository } from "../../../common/repositories/todoLogRepository";
import { TodoRepository } from "../../../common/repositories/todoRepository";
import type { Database } from "../../../db";
import type { CoachSessionPhase, ObjectiveStatus } from "../../../db/schema/constants";
import type { Bindings } from "../../../types/env";
import { mapGoalToResponse } from "../../goals/helpers/categoryMapping.helper";
import { mapMilestoneToResponse } from "../../milestones/helpers/milestoneMapper.helper";
import { mapTodoToResponse } from "../../todos/helpers/todoMapper.helper";
import type { CoachChatPromptMessage } from "../helpers/coachChatPrompt.helper";
import { buildChatUserPrompt } from "../helpers/coachChatPrompt.helper";
import { resolveNextPhase } from "../helpers/coachPhase.helper";
import type { ProposalEnvelope } from "../helpers/coachProposal.helper";
import { parseProposalPayload, toPromptMessage } from "../helpers/coachProposal.helper";
import { buildGoalSnapshot } from "../helpers/goalSnapshot.helper";
import { createCoachModel } from "../lib/coachModel";
import type { CoachTurnResult } from "../lib/coachOrchestrator";
import { runCoachTurn } from "../lib/coachOrchestrator";
import { getChatSystemInstruction } from "../prompts/coachPrompts";

export type AdoptPlanItemTarget =
	| { type: "keyResult"; keyResultIndex: number }
	| { type: "todo"; todoIndex: number };

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
	// Objective採用時、LLMがdeadlineをnullで返した場合のフォールバック期限(日数)
	private static readonly DEFAULT_OBJECTIVE_HORIZON_DAYS = 90;
	// 探索スレッド新規作成時の検討中テーマラベル(実タイトル確定前の暫定値)
	private static readonly EXPLORATION_THREAD_LABEL = "目標を決める相談";

	private conversationRepo: CoachConversationRepository;
	private messageRepo: CoachMessageRepository;
	private goalRepo: GoalRepository;
	private categoryRepo: GoalCategoryRepository;
	private milestoneRepo: MilestoneRepository;
	private todoRepo: TodoRepository;
	private todoLogRepo: TodoLogRepository;

	constructor(private db: Database) {
		this.conversationRepo = new CoachConversationRepository(db);
		this.messageRepo = new CoachMessageRepository(db);
		this.goalRepo = new GoalRepository(db);
		this.categoryRepo = new GoalCategoryRepository(db);
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

	// ストリーミング応答を開始する。呼び出し側はuiStreamをHTTPレスポンスとして
	// クライアントへ流し、ストリーム終端後にpersistTurn()を呼んでuser・assistant
	// メッセージを永続化する。db.batch()はLLM呼び出しの結果が確定してからでないと
	// 組めないため、「アトミックな2メッセージ書き込み」自体はストリーム完了後に行う
	// （ユーザー入力とLLM結果が両方揃うまで書き込みを遅らせる点は元の実装を維持）。
	async startMessageStream(userId: string, conversationId: string, content: string, env: Bindings) {
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

		// GROWフェーズはobjectiveStatus="decided"(通常スレッド)のみ問い合わせる。探索スレッドは
		// 既存のEXPLORATION_ADDENDUM(4ビート誘導)が同種の目的を担保しているため対象外
		const phase = conversation.objectiveStatus === "decided" ? conversation.phase : undefined;

		const { prompt, existingKeyResultTitles } =
			conversation.goalId && goal
				? await this.buildLivingGoalPrompt(goal, history, phase)
				: {
						// goalスレッドで目標が削除済みの場合、および探索スレッド(目標未確定)の
						// 両方がこの分岐に入る。探索スレッドでは「削除済み」の注記は不適切なため
						// goalDeletedはgoalスレッドの場合のみtrueにする。
						// activeGoalCountは上限到達をAIが対話で先に伝えるための情報であり、
						// 探索スレッド(目標を新たに増やす可能性がある場合)でのみ必要なため、
						// goalスレッドでは不要なDB呼び出しを避けnullを渡す
						prompt: buildChatUserPrompt({
							goalTitle: conversation.goalTitleSnapshot,
							goalDeadline: conversation.goalDeadlineSnapshot,
							goalDeleted: conversation.objectiveStatus === "decided",
							history,
							today: CoachChatService.todayIsoDate(),
							activeGoalCount:
								conversation.objectiveStatus === "undecided"
									? await this.goalRepo.countActiveByUserId(userId)
									: undefined,
							phase,
						}),
						existingKeyResultTitles: [] as string[],
					};

		const model = createCoachModel(env);
		const { uiStream, turnResult } = runCoachTurn({
			model,
			system: getChatSystemInstruction("calmMentor", conversation.objectiveStatus),
			prompt,
			existingKeyResultTitles,
			objectiveStatus: conversation.objectiveStatus,
		});

		const persistTurn = () =>
			this.persistCompletedTurn(conversationId, content, turnResult, {
				objectiveStatus: conversation.objectiveStatus,
				phase: conversation.phase,
				turnsInPhase: conversation.turnsInPhase,
			});

		return { uiStream, persistTurn };
	}

	// ストリーム完了後にuser・assistantの2メッセージと、conversationの更新(phase遷移または
	// updatedAtのみ)をアトミックに書き込む。LLM呼び出しがエラーで終わった場合はuser行も
	// 書き込まず、孤立行を残さない。
	private async persistCompletedTurn(
		conversationId: string,
		userContent: string,
		turnResult: CoachTurnResult["turnResult"],
		phaseState: {
			objectiveStatus: ObjectiveStatus;
			phase: CoachSessionPhase;
			turnsInPhase: number;
		},
	) {
		const { reply, proposal, phase: declaredPhase } = await turnResult;

		// undecided(探索)スレッドはGROWフェーズを適用しないため既存どおりtouchStmtのみ行う
		const conversationUpdateStmt =
			phaseState.objectiveStatus === "decided"
				? (() => {
						const resolved = resolveNextPhase(
							phaseState.phase,
							declaredPhase,
							phaseState.turnsInPhase,
						);
						return this.conversationRepo.setPhaseStmt(
							conversationId,
							resolved.phase,
							resolved.turnsInPhase,
						);
					})()
				: this.conversationRepo.touchStmt(conversationId);

		const [, [assistantMessage]] = await this.db.batch([
			this.messageRepo.insertStmt({ conversationId, role: "user", content: userContent }),
			this.messageRepo
				.insertStmt({
					conversationId,
					role: "assistant",
					content: reply,
					proposal: proposal ? JSON.stringify(proposal) : null,
				})
				.returning(),
			conversationUpdateStmt,
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
		// messageの所有権不成立(他人のmessage)は「存在しない」と同一応答に揃える。
		// messageIdは連番autoincrementのため、文言差でIDの存在有無を列挙されるのを防ぐ(IDOR安全側)
		if (!conversation) {
			throw new PlanItemNotFoundError(messageId);
		}
		// 自分の会話だが目標未確定(探索)スレッド。自分の情報なので列挙オラクルにはならない
		if (!conversation.goalId) {
			throw new CoachConversationNotFoundError(message.conversationId);
		}

		const envelope = parseProposalPayload(message.proposal);
		const goalId = conversation.goalId;

		if (target.type === "keyResult") {
			const keyResult = envelope.keyResults[target.keyResultIndex];
			if (!keyResult) {
				throw new PlanItemNotFoundError(messageId);
			}
			if (keyResult.adopted) {
				throw new PlanItemAlreadyAdoptedError(messageId);
			}

			// idを先に採番することで、milestone作成とproposal更新を1つのbatchで
			// アトミックに実行できる。片方だけ成功して二重採用が起きる状態を防ぐ。
			// sortOrderの採番ルールは共有リポジトリに委譲し、coachにドメインロジックを持ち込まない。
			const milestoneId = crypto.randomUUID();
			const sortOrder = await this.milestoneRepo.nextSortOrder(goalId);
			envelope.keyResults[target.keyResultIndex] = {
				...keyResult,
				adopted: true,
				createdMilestoneId: milestoneId,
			};

			const [[createdMilestone]] = await this.db.batch([
				this.milestoneRepo
					.insertStmt({
						id: milestoneId,
						goalId,
						title: keyResult.title,
						sortOrder,
						// 提案の定量目標を引き継ぐ。現在値は0開始（採用後に＋更新で進捗を入れる）
						targetValue: keyResult.targetValue,
						unit: keyResult.unit,
					})
					.returning(),
				this.messageRepo.updateProposalStmt(messageId, JSON.stringify(envelope)),
			]);

			return { proposal: envelope, milestone: mapMilestoneToResponse(createdMilestone) };
		}

		const targetTodo = envelope.todos[target.todoIndex];
		if (!targetTodo) {
			throw new PlanItemNotFoundError(messageId);
		}
		if (targetTodo.adopted) {
			throw new PlanItemAlreadyAdoptedError(messageId);
		}
		// このproposalにKey Resultが含まれる場合、全て採用済みになるまでTODOはブロックする
		// (どのKRに紐づくかの情報を持たないため、todoはmilestoneId未指定で作成する)
		if (envelope.keyResults.length > 0 && !envelope.keyResults.every((kr) => kr.adopted)) {
			throw new MilestoneNotAdoptedYetError(messageId);
		}

		const todoId = crypto.randomUUID();
		envelope.todos[target.todoIndex] = { ...targetTodo, adopted: true, createdTodoId: todoId };

		const [[createdTodo]] = await this.db.batch([
			this.todoRepo
				.insertStmt({
					id: todoId,
					goalId,
					title: targetTodo.title,
					taskType: targetTodo.taskType,
					isAiGenerated: 1,
				})
				.returning(),
			this.messageRepo.updateProposalStmt(messageId, JSON.stringify(envelope)),
		]);

		return { proposal: envelope, todo: mapTodoToResponse(createdTodo, 0) };
	}

	// 探索スレッド(kind="exploration")の新規作成/既存取得。既存スレッドがあれば
	// そのまま返す(LLM呼び出しなし)。新規時はconversation行のみ作成し、第一声の生成は
	// 呼び出し側がisNewを見てstartFirstTurnStream()を別途呼ぶ(SSEレスポンスの範囲で完結させる)
	async startOrGetExplorationConversation(userId: string) {
		const existing = await this.conversationRepo.findOpenExplorationByUserId(userId);
		if (existing) return { conversation: existing, isNew: false };

		// 上限到達が既に分かっている場合、conversation作成もLLM呼び出し(第一声生成)も
		// 一切発生させずに弾く。採用可否は後で決まる話ではなく、事前に判定可能な条件のため
		const activeCount = await this.goalRepo.countActiveByUserId(userId);
		if (activeCount >= MAX_ACTIVE_GOALS) {
			throw new GoalLimitExceededError(MAX_ACTIVE_GOALS);
		}

		try {
			const conversation = await this.conversationRepo.createExploration({
				userId,
				titleSnapshot: CoachChatService.EXPLORATION_THREAD_LABEL,
			});
			return { conversation, isNew: true };
		} catch (e) {
			// 部分ユニークインデックス(idx_coach_conversations_user_undecided_objective)により、
			// 並行リクエストで先に作られていた場合はinsertが失敗する。その場合は既存スレッドを返す。
			const raced = await this.conversationRepo.findOpenExplorationByUserId(userId);
			if (raced) return { conversation: raced, isNew: false };
			throw e;
		}
	}

	// 探索スレッドの第一声を生成する。冪等性ガード: 履歴が0件の場合のみ生成し、
	// 既に何らかのメッセージがある場合は何もしない(再訪ごとに第一声が増えるのを防ぐ)
	async startFirstTurnStream(userId: string, conversationId: string, env: Bindings) {
		if (!env.GEMINI_API_KEY) {
			throw new CoachNotConfiguredError();
		}

		const conversation = await this.conversationRepo.findByIdAndUserId(conversationId, userId);
		if (!conversation) {
			throw new CoachConversationNotFoundError(conversationId);
		}

		const existing = await this.messageRepo.findRecentByConversationId(conversationId, 1);
		if (existing.length > 0) {
			return undefined;
		}

		const activeGoalCount = await this.goalRepo.countActiveByUserId(userId);
		const model = createCoachModel(env);
		const { uiStream, turnResult } = runCoachTurn({
			model,
			system: getChatSystemInstruction("calmMentor", "undecided"),
			prompt: buildChatUserPrompt({
				goalTitle: conversation.goalTitleSnapshot,
				goalDeadline: conversation.goalDeadlineSnapshot,
				goalDeleted: false,
				history: [],
				today: CoachChatService.todayIsoDate(),
				activeGoalCount,
			}),
			existingKeyResultTitles: [],
			objectiveStatus: "undecided",
		});

		const persistTurn = () => this.persistFirstTurn(conversationId, turnResult);

		return { uiStream, persistTurn };
	}

	// 第一声のみを永続化する(userメッセージは存在しない)。第一声生成が失敗した場合は
	// 何も書き込まず、呼び出し側がwaitUntilでcatchすることで「第一声なしのスレッド」を許容する
	private async persistFirstTurn(
		conversationId: string,
		turnResult: CoachTurnResult["turnResult"],
	) {
		const { reply, proposal } = await turnResult;

		const [[assistantMessage]] = await this.db.batch([
			this.messageRepo
				.insertStmt({
					conversationId,
					role: "assistant",
					content: reply,
					proposal: proposal ? JSON.stringify(proposal) : null,
				})
				.returning(),
			this.conversationRepo.touchStmt(conversationId),
		]);

		return assistantMessage;
	}

	// 探索スレッドで提案されたObjective+KRを1クリックで同時採用する。goal+milestones作成、
	// conversationのgoalスレッドへのリンク、proposal更新をdb.batch()でアトミックに行う
	async adoptObjective(userId: string, messageId: number) {
		const message = await this.messageRepo.findById(messageId);
		if (!message || !message.proposal) {
			throw new PlanItemNotFoundError(messageId);
		}

		const conversation = await this.conversationRepo.findByIdAndUserId(
			message.conversationId,
			userId,
		);
		// messageの所有権不成立(他人のmessage)は「存在しない」と同一応答に揃える(F2/IDOR安全側)
		if (!conversation) {
			throw new PlanItemNotFoundError(messageId);
		}
		if (conversation.goalId) {
			throw new ExplorationThreadAlreadyLinkedError(conversation.id);
		}

		const envelope = parseProposalPayload(message.proposal);
		if (!envelope.objective) {
			throw new PlanItemNotFoundError(messageId);
		}
		if (envelope.keyResults.some((kr) => kr.adopted)) {
			throw new ObjectiveAlreadyAdoptedError(messageId);
		}

		const activeCount = await this.goalRepo.countActiveByUserId(userId);
		if (activeCount >= MAX_ACTIVE_GOALS) {
			throw new GoalLimitExceededError(MAX_ACTIVE_GOALS);
		}

		// カテゴリ解決はDB書き込み(既定カテゴリの初回作成)を伴うため、batch前に実行する
		const categoryId = await resolveCategoryId(
			this.categoryRepo,
			userId,
			envelope.objective.category,
		);

		const goalId = crypto.randomUUID();
		// LLMがdeadlineを本日より過去の日付で返した場合に備えたサーバー側の安全網。
		// プロンプトのハードルールだけに依存せず、DBに不正な期限が入ることを確実に防ぐ
		const isPastDeadline =
			envelope.objective.deadline !== null &&
			envelope.objective.deadline < CoachChatService.todayIsoDate();
		const deadline =
			envelope.objective.deadline && !isPastDeadline
				? envelope.objective.deadline
				: this.defaultObjectiveDeadline();
		const keyResultIds = envelope.keyResults.map(() => crypto.randomUUID());

		const updatedEnvelope: ProposalEnvelope = {
			...envelope,
			keyResults: envelope.keyResults.map((kr, i) => ({
				...kr,
				adopted: true,
				createdMilestoneId: keyResultIds[i],
			})),
		};

		const [[createdGoal]] = await this.db.batch([
			this.goalRepo
				.insertStmt({
					id: goalId,
					userId,
					title: envelope.objective.title,
					categoryId,
					dueDate: deadline,
				})
				.returning(),
			this.milestoneRepo.insertManyStmt(
				envelope.keyResults.map((kr, i) => ({
					id: keyResultIds[i],
					goalId,
					title: kr.title,
					sortOrder: i,
					targetValue: kr.targetValue,
					unit: kr.unit,
				})),
			),
			this.conversationRepo.linkGoalStmt(
				conversation.id,
				goalId,
				envelope.objective.title,
				deadline,
			),
			this.messageRepo.updateProposalStmt(messageId, JSON.stringify(updatedEnvelope)),
		]);

		const categoryName = getCategoryNameFromKey(envelope.objective.category);
		return { goal: mapGoalToResponse(createdGoal, categoryName), proposal: updatedEnvelope };
	}

	private defaultObjectiveDeadline(): string {
		const deadline = new Date();
		deadline.setDate(deadline.getDate() + CoachChatService.DEFAULT_OBJECTIVE_HORIZON_DAYS);
		return deadline.toISOString().slice(0, 10);
	}

	private async buildLivingGoalPrompt(
		goal: { title: string; dueDate: string | null; id: string },
		history: CoachChatPromptMessage[],
		phase: CoachSessionPhase | undefined,
	): Promise<{ prompt: string; existingKeyResultTitles: string[] }> {
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
			today: CoachChatService.todayIsoDate(),
			// goalスレッドではactiveGoalCountを渡さない(呼び出し元のコメント参照)
			phase,
		});

		return { prompt, existingKeyResultTitles: milestones.map((m) => m.title) };
	}

	private static todayIsoDate(): string {
		return new Date().toISOString().slice(0, 10);
	}
}
