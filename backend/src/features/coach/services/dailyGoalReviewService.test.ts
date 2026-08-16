import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDb } from "../../../db";
import type { Bindings } from "../../../types/env";
import * as coachModel from "../lib/coachModel";
import { DailyGoalReviewService } from "./dailyGoalReviewService";

// db.batch()以外のD1メソッドは呼び出されない（クエリビルダーの生成のみで
// 実行しないため）。呼ばれたら明示的に失敗させ、想定外の依存を検知する。
function createUnusedD1(): D1Database {
	const fail = (name: string) => () => {
		throw new Error(`unexpected D1 method call: ${name}`);
	};
	return {
		prepare: fail("prepare"),
		dump: fail("dump"),
		exec: fail("exec"),
		batch: fail("batch"),
		withSession: fail("withSession"),
	} as unknown as D1Database;
}

const ENV = { GEMINI_API_KEY: "dummy" } as Bindings;

const GOAL = {
	id: "goal-1",
	userId: "user-1",
	title: "TOEIC800点を取る",
	dueDate: "2026-12-31",
};

type ServiceInternals = {
	goalRepo: { findAllActiveForDailyReview: (...args: unknown[]) => unknown };
	conversationRepo: {
		findByGoalId: (...args: unknown[]) => unknown;
		create: (...args: unknown[]) => unknown;
		touchStmt: (...args: unknown[]) => unknown;
	};
	reviewRepo: {
		tryReserve: (...args: unknown[]) => unknown;
		linkMessageStmt: (...args: unknown[]) => unknown;
	};
	milestoneRepo: { findAllByGoalId: (...args: unknown[]) => unknown };
	todoRepo: { findAllByGoalId: (...args: unknown[]) => unknown };
	todoLogRepo: { findAllByTodoIds: (...args: unknown[]) => unknown };
	chatGate: { resolveForUndecidedMessage: (...args: unknown[]) => unknown };
	messageRepo: { insertStmt: (...args: unknown[]) => unknown };
};

function internals(service: DailyGoalReviewService): ServiceInternals {
	return service as unknown as ServiceInternals;
}

describe("DailyGoalReviewService", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe("runForAllGoals", () => {
		it("スキップ済み(予約失敗)のgoalはLLMを呼ばずにskippedとして集計する", async () => {
			const db = createDb(createUnusedD1());
			const service = new DailyGoalReviewService(db);
			const deps = internals(service);

			vi.spyOn(deps.goalRepo, "findAllActiveForDailyReview").mockResolvedValue([GOAL]);
			vi.spyOn(deps.reviewRepo, "tryReserve").mockResolvedValue(undefined);
			const generateSpy = vi.spyOn(coachModel, "generateStructured");

			const summary = await service.runForAllGoals(ENV);

			expect(summary).toEqual({ processed: 0, skipped: 1, failed: 0 });
			expect(generateSpy).not.toHaveBeenCalled();
		});

		it("milestoneUpdates/todosが両方空ならメッセージを保存せずskippedにする", async () => {
			const db = createDb(createUnusedD1());
			const service = new DailyGoalReviewService(db);
			const deps = internals(service);

			vi.spyOn(deps.goalRepo, "findAllActiveForDailyReview").mockResolvedValue([GOAL]);
			vi.spyOn(deps.reviewRepo, "tryReserve").mockResolvedValue({
				id: "review-1",
			});
			vi.spyOn(deps.conversationRepo, "findByGoalId").mockResolvedValue({
				id: "conv-1",
				userId: GOAL.userId,
				goalId: GOAL.id,
			});
			vi.spyOn(deps.milestoneRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(deps.todoRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(deps.todoLogRepo, "findAllByTodoIds").mockResolvedValue([]);
			vi.spyOn(deps.chatGate, "resolveForUndecidedMessage").mockResolvedValue(
				"gemini-3.5-flash-lite",
			);
			vi.spyOn(coachModel, "generateStructured").mockResolvedValue({
				reply: "順調だ。",
				milestoneUpdates: [],
				todos: [],
				todoUpdates: [],
			});
			const batchSpy = vi.spyOn(db, "batch");

			const summary = await service.runForAllGoals(ENV);

			expect(summary).toEqual({ processed: 0, skipped: 1, failed: 0 });
			expect(batchSpy).not.toHaveBeenCalled();
		});

		it("会話が存在しない場合は遅延生成してから提案を保存する", async () => {
			const db = createDb(createUnusedD1());
			const service = new DailyGoalReviewService(db);
			const deps = internals(service);

			vi.spyOn(deps.goalRepo, "findAllActiveForDailyReview").mockResolvedValue([GOAL]);
			vi.spyOn(deps.reviewRepo, "tryReserve").mockResolvedValue({
				id: "review-1",
			});
			vi.spyOn(deps.conversationRepo, "findByGoalId").mockResolvedValue(undefined);
			const createSpy = vi
				.spyOn(deps.conversationRepo, "create")
				.mockResolvedValue({ id: "conv-new" });
			vi.spyOn(deps.milestoneRepo, "findAllByGoalId").mockResolvedValue([
				{
					id: "m1",
					title: "模試900点",
					startValue: 0,
					currentValue: 500,
					targetValue: 900,
					unit: "点",
					isCompleted: 0,
				},
			]);
			vi.spyOn(deps.todoRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(deps.todoLogRepo, "findAllByTodoIds").mockResolvedValue([]);
			vi.spyOn(deps.chatGate, "resolveForUndecidedMessage").mockResolvedValue(
				"gemini-3.5-flash-lite",
			);
			vi.spyOn(coachModel, "generateStructured").mockResolvedValue({
				reply: "現在のペースだと推定700点だ。",
				milestoneUpdates: [
					{
						milestoneId: "m1",
						suggestedCurrentValue: 700,
						reason: "TODOの完了ペースから推定",
					},
				],
				todos: [],
				todoUpdates: [],
			});
			const assistantRow = { id: 42, conversationId: "conv-new" };
			vi.spyOn(db, "batch").mockResolvedValue([[], [assistantRow]] as unknown as Awaited<
				ReturnType<typeof db.batch>
			>);
			const linkMessageStmtSpy = vi
				.spyOn(deps.reviewRepo, "linkMessageStmt")
				.mockReturnValue({ run: vi.fn().mockResolvedValue(undefined) });

			const summary = await service.runForAllGoals(ENV);

			expect(createSpy).toHaveBeenCalledWith({
				userId: GOAL.userId,
				goalId: GOAL.id,
				goalTitleSnapshot: GOAL.title,
				goalDeadlineSnapshot: GOAL.dueDate,
			});
			expect(linkMessageStmtSpy).toHaveBeenCalledWith("review-1", 42);
			expect(summary).toEqual({ processed: 1, skipped: 0, failed: 0 });
		});

		it("todoUpdatesのみ非空の場合もメッセージを保存する", async () => {
			const db = createDb(createUnusedD1());
			const service = new DailyGoalReviewService(db);
			const deps = internals(service);

			vi.spyOn(deps.goalRepo, "findAllActiveForDailyReview").mockResolvedValue([GOAL]);
			vi.spyOn(deps.reviewRepo, "tryReserve").mockResolvedValue({
				id: "review-1",
			});
			vi.spyOn(deps.conversationRepo, "findByGoalId").mockResolvedValue({
				id: "conv-1",
				userId: GOAL.userId,
				goalId: GOAL.id,
			});
			vi.spyOn(deps.milestoneRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(deps.todoRepo, "findAllByGoalId").mockResolvedValue([
				{
					id: "t1",
					title: "過去問を1日1回演習する",
					taskType: "daily",
					priority: "medium",
					dueDate: "2026-08-01",
					isCompleted: 0,
				},
			]);
			vi.spyOn(deps.todoLogRepo, "findAllByTodoIds").mockResolvedValue([]);
			vi.spyOn(deps.chatGate, "resolveForUndecidedMessage").mockResolvedValue(
				"gemini-3.5-flash-lite",
			);
			vi.spyOn(coachModel, "generateStructured").mockResolvedValue({
				reply: "期限を見直すべきだ。",
				milestoneUpdates: [],
				todos: [],
				todoUpdates: [
					{ todoId: "t1", suggestedDueDate: "2026-09-01", reason: "期限超過が続いている" },
				],
			});
			const assistantRow = { id: 43, conversationId: "conv-1" };
			vi.spyOn(db, "batch").mockResolvedValue([[], [assistantRow]] as unknown as Awaited<
				ReturnType<typeof db.batch>
			>);
			vi.spyOn(deps.reviewRepo, "linkMessageStmt").mockReturnValue({
				run: vi.fn().mockResolvedValue(undefined),
			});

			const summary = await service.runForAllGoals(ENV);

			expect(summary).toEqual({ processed: 1, skipped: 0, failed: 0 });
		});

		it("LLM呼び出しが失敗したgoalはfailedとして集計し、予約行はそのまま残る", async () => {
			const db = createDb(createUnusedD1());
			const service = new DailyGoalReviewService(db);
			const deps = internals(service);

			vi.spyOn(deps.goalRepo, "findAllActiveForDailyReview").mockResolvedValue([GOAL]);
			const tryReserveSpy = vi
				.spyOn(deps.reviewRepo, "tryReserve")
				.mockResolvedValue({ id: "review-1" });
			vi.spyOn(deps.conversationRepo, "findByGoalId").mockResolvedValue({
				id: "conv-1",
				userId: GOAL.userId,
				goalId: GOAL.id,
			});
			vi.spyOn(deps.milestoneRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(deps.todoRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(deps.todoLogRepo, "findAllByTodoIds").mockResolvedValue([]);
			vi.spyOn(deps.chatGate, "resolveForUndecidedMessage").mockResolvedValue(
				"gemini-3.5-flash-lite",
			);
			vi.spyOn(coachModel, "generateStructured").mockRejectedValue(new Error("LLM error"));

			const summary = await service.runForAllGoals(ENV);

			expect(summary).toEqual({ processed: 0, skipped: 0, failed: 1 });
			// 失敗時に予約行を解除するAPIを呼ばないことの確認(当日は再試行しない設計)
			expect(tryReserveSpy).toHaveBeenCalledTimes(1);
		});

		it("複数goalを独立に処理し、1件の予約失敗が他のgoalの処理を止めない", async () => {
			const db = createDb(createUnusedD1());
			const service = new DailyGoalReviewService(db);
			const deps = internals(service);

			const goalReserved = { ...GOAL, id: "goal-reserved" };
			const goalSkipped = { ...GOAL, id: "goal-skipped" };
			vi.spyOn(deps.goalRepo, "findAllActiveForDailyReview").mockResolvedValue([
				goalReserved,
				goalSkipped,
			]);
			vi.spyOn(deps.reviewRepo, "tryReserve").mockImplementation(async (goalId: unknown) =>
				goalId === goalSkipped.id ? undefined : { id: `review-${goalId}` },
			);
			vi.spyOn(deps.conversationRepo, "findByGoalId").mockResolvedValue({
				id: "conv-1",
				userId: GOAL.userId,
				goalId: goalReserved.id,
			});
			vi.spyOn(deps.milestoneRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(deps.todoRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(deps.todoLogRepo, "findAllByTodoIds").mockResolvedValue([]);
			vi.spyOn(deps.chatGate, "resolveForUndecidedMessage").mockResolvedValue(
				"gemini-3.5-flash-lite",
			);
			const generateSpy = vi.spyOn(coachModel, "generateStructured").mockResolvedValue({
				reply: "順調だ。",
				milestoneUpdates: [],
				todos: [],
				todoUpdates: [],
			});

			const summary = await service.runForAllGoals(ENV);

			// goal-skippedは予約が取れず(既に実行済み扱い)LLMを呼ばれずスキップ、
			// goal-reservedは予約に成功するがmilestoneUpdates/todosが空のため保存されずスキップ
			expect(summary).toEqual({ processed: 0, skipped: 2, failed: 0 });
			expect(generateSpy).toHaveBeenCalledTimes(1);
		});
	});
});
