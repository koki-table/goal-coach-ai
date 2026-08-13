import { todayIsoDate } from "../../../common/helpers/date.helper";
import { CoachConversationRepository } from "../../../common/repositories/coachConversationRepository";
import { CoachDailyReviewRepository } from "../../../common/repositories/coachDailyReviewRepository";
import { CoachMessageRepository } from "../../../common/repositories/coachMessageRepository";
import { GoalRepository } from "../../../common/repositories/goalRepository";
import { MilestoneRepository } from "../../../common/repositories/milestoneRepository";
import { TodoLogRepository } from "../../../common/repositories/todoLogRepository";
import { TodoRepository } from "../../../common/repositories/todoRepository";
import type { Database } from "../../../db";
import type { Bindings } from "../../../types/env";
import { toDailyReviewProposalEnvelope } from "../helpers/coachProposal.helper";
import { buildDailyReviewPrompt } from "../helpers/dailyReviewPrompt.helper";
import { buildGoalSnapshot } from "../helpers/goalSnapshot.helper";
import { createCoachModel, generateStructured } from "../lib/coachModel";
import { dailyReviewReplySchema, getDailyReviewSystemInstruction } from "../prompts/coachPrompts";
import { CoachChatGate } from "./coachChatGate";

export type DailyGoalReviewSummary = {
	processed: number;
	skipped: number;
	failed: number;
};

export class DailyGoalReviewService {
	// LLM呼び出しの同時実行数を抑えるためのチャンクサイズ。I/O待ちが支配的なため
	// 過度な並列制御は不要だが、レート制限・タイムアウトのリスクを抑える目的で小さめにする
	private static readonly BATCH_CHUNK_SIZE = 5;

	private goalRepo: GoalRepository;
	private conversationRepo: CoachConversationRepository;
	private messageRepo: CoachMessageRepository;
	private reviewRepo: CoachDailyReviewRepository;
	private milestoneRepo: MilestoneRepository;
	private todoRepo: TodoRepository;
	private todoLogRepo: TodoLogRepository;
	private chatGate: CoachChatGate;

	constructor(private db: Database) {
		this.goalRepo = new GoalRepository(db);
		this.conversationRepo = new CoachConversationRepository(db);
		this.messageRepo = new CoachMessageRepository(db);
		this.reviewRepo = new CoachDailyReviewRepository(db);
		this.milestoneRepo = new MilestoneRepository(db);
		this.todoRepo = new TodoRepository(db);
		this.todoLogRepo = new TodoLogRepository(db);
		this.chatGate = new CoachChatGate(db);
	}

	// scheduled handlerから呼ぶ。全active goalを横断し、goalごとに日次レビューを1件実行する。
	// 1goalの失敗(LLMエラー等)が他goalの処理を止めないよう、チャンクごとにPromise.allSettledで実行する。
	async runForAllGoals(env: Bindings): Promise<DailyGoalReviewSummary> {
		const goals = await this.goalRepo.findAllActiveForDailyReview();
		const todayIso = todayIsoDate();
		const summary: DailyGoalReviewSummary = {
			processed: 0,
			skipped: 0,
			failed: 0,
		};

		for (let i = 0; i < goals.length; i += DailyGoalReviewService.BATCH_CHUNK_SIZE) {
			const chunk = goals.slice(i, i + DailyGoalReviewService.BATCH_CHUNK_SIZE);
			const results = await Promise.allSettled(
				chunk.map((goal) => this.reviewSingleGoal(goal, todayIso, env)),
			);
			for (const result of results) {
				if (result.status === "fulfilled") {
					summary[result.value]++;
				} else {
					summary.failed++;
				}
			}
		}

		return summary;
	}

	// 1goal分の日次レビュー。冪等性予約→会話取得(遅延生成)→スナップショット構築→LLM呼び出し→
	// 提案の永続化、という一連の処理を行う。LLM呼び出しが失敗した場合は予約行を残したまま
	// 何もしない(当日は再試行しない。理由: 日次レビューは「今日はもう出さない」という
	// 一意性の保証が目的であり、失敗時に同日中に再試行してもLLM側の一時的な問題は解決しない
	// 可能性が高く、次の日次実行まで待つ方が安全。暴走再試行を防ぐ)。
	private async reviewSingleGoal(
		goal: { id: string; userId: string; title: string; dueDate: string | null },
		todayIso: string,
		env: Bindings,
	): Promise<"processed" | "skipped" | "failed"> {
		const reservation = await this.reviewRepo.tryReserve(goal.id, todayIso);
		if (!reservation) return "skipped";

		try {
			// goal作成時に会話は自動生成されない(ユーザーが実際にCoachチャットを開いた時に
			// 遅延作成される)。日次レビューはユーザー操作を待たずに実行するため、ここで
			// 遅延生成する(スキップすると通常フローで作られたGoalの多くが対象外になってしまう)。
			const conversation = await this.conversationRepo.findByGoalId(goal.userId, goal.id);
			const conversationId = conversation
				? conversation.id
				: (
						await this.conversationRepo.create({
							userId: goal.userId,
							goalId: goal.id,
							goalTitleSnapshot: goal.title,
							goalDeadlineSnapshot: goal.dueDate ?? undefined,
						})
					).id;

			const [milestones, todos] = await Promise.all([
				this.milestoneRepo.findAllByGoalId(goal.id),
				this.todoRepo.findAllByGoalId(goal.id),
			]);
			const todoLogs = await this.todoLogRepo.findAllByTodoIds(todos.map((t) => t.id));
			const snapshot = buildGoalSnapshot(todos, milestones, todoLogs, new Date());

			const incompleteMilestones = milestones.filter((m) => m.isCompleted === 0);
			const prompt = buildDailyReviewPrompt({
				goalTitle: goal.title,
				goalDeadline: goal.dueDate,
				today: todayIso,
				snapshot,
				milestones: incompleteMilestones.map((m) => ({
					id: m.id,
					title: m.title,
					startValue: m.startValue,
					currentValue: m.currentValue,
					targetValue: m.targetValue,
					unit: m.unit,
				})),
				existingTodoTitles: todos.map((t) => t.title),
			});

			// 日次レビューはユーザーの対話ではないため、decided会話の日次カウンタを
			// 消費すべきではない。resolveForUndecidedMessageはカウンタを消費せず
			// tier別モデルのみ返す既存メソッドで、この目的にそのまま合致する
			const modelId = await this.chatGate.resolveForUndecidedMessage(goal.userId);
			const model = createCoachModel(env, modelId);

			const result = await generateStructured({
				model,
				system: getDailyReviewSystemInstruction("calmMentor"),
				prompt,
				schema: dailyReviewReplySchema,
			});

			const envelope = toDailyReviewProposalEnvelope(
				result,
				incompleteMilestones.map((m) => ({
					id: m.id,
					title: m.title,
					startValue: m.startValue,
					currentValue: m.currentValue,
					targetValue: m.targetValue,
					isCompleted: false,
				})),
			);

			// 提案すべき内容が何もなければメッセージを保存せず静かにスキップする
			// (ユーザーに無意味な通知を送らない)
			if (envelope.milestoneUpdates.length === 0 && envelope.todos.length === 0) {
				return "skipped";
			}

			const [, [assistantMessage]] = await this.db.batch([
				this.conversationRepo.touchStmt(conversationId),
				this.messageRepo
					.insertStmt({
						conversationId,
						role: "assistant",
						content: result.reply,
						proposal: JSON.stringify(envelope),
						model: modelId,
					})
					.returning(),
			]);

			// 自動採番PKのため、messageId確定後に予約行へ紐づけるステートメントを別途実行する
			// (db.batch内でinsertの結果を後続statementの引数に使えないため2段階になる)
			await this.reviewRepo.linkMessageStmt(reservation.id, assistantMessage.id).run();

			return "processed";
		} catch (error) {
			console.error(`daily review failed for goal ${goal.id}`, error);
			return "failed";
		}
	}
}
