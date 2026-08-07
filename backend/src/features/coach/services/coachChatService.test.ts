import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ExplorationThreadAlreadyLinkedError,
	GoalLimitExceededError,
	ObjectiveAlreadyAdoptedError,
	PlanItemNotFoundError,
} from "../../../common/errors";
import { createDb } from "../../../db";
import type { Bindings } from "../../../types/env";
import * as coachModel from "../lib/coachModel";
import { CoachChatService } from "./coachChatService";

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

function mockStreamModelReturning(objectText: string) {
	return new MockLanguageModelV4({
		doStream: async () => ({
			stream: new ReadableStream({
				start(controller) {
					controller.enqueue({ type: "text-start", id: "1" });
					controller.enqueue({ type: "text-delta", id: "1", delta: objectText });
					controller.enqueue({ type: "text-end", id: "1" });
					controller.enqueue({
						type: "finish",
						finishReason: { unified: "stop", raw: undefined },
						usage: {
							inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
							outputTokens: { total: 10, text: 10, reasoning: undefined },
						},
					});
					controller.close();
				},
			}),
		}),
	});
}

async function drainStream(stream: ReadableStream<unknown>) {
	for await (const _chunk of stream as unknown as AsyncIterable<unknown>) {
		// consume only
	}
}

describe("CoachChatService", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe("persistCompletedTurn (via startMessageStream)", () => {
		it("writes the user message, the assistant message, and the conversation touch in a single db.batch call", async () => {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);

			const conversationId = "conv-1";
			const userId = "user-1";

			// conversationRepo/messageRepo/goalRepoはCoachChatService内部でnewされるため、
			// プロトタイプメソッドを直接スパイして依存の実DB呼び出しを避ける。
			const conversationRepo = (
				service as unknown as {
					conversationRepo: {
						findByIdAndUserId: (...args: unknown[]) => unknown;
						touchStmt: (...args: unknown[]) => unknown;
					};
				}
			).conversationRepo;
			const messageRepo = (
				service as unknown as {
					messageRepo: {
						countUserMessagesByUserIdSince: (...args: unknown[]) => unknown;
						findRecentByConversationId: (...args: unknown[]) => unknown;
						insertStmt: (...args: unknown[]) => unknown;
					};
				}
			).messageRepo;
			const goalRepo = (
				service as unknown as {
					goalRepo: {
						findByIdAndUserId: (...args: unknown[]) => unknown;
						countActiveByUserId: (...args: unknown[]) => unknown;
					};
				}
			).goalRepo;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				kind: "exploration",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "countUserMessagesByUserIdSince").mockResolvedValue(0);
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([]);
			vi.spyOn(goalRepo, "findByIdAndUserId").mockResolvedValue(undefined);
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(0);

			const insertStmtSpy = vi.spyOn(messageRepo, "insertStmt");
			const touchStmtSpy = vi.spyOn(conversationRepo, "touchStmt");

			const model = mockStreamModelReturning(
				JSON.stringify({ reply: "了解しました。", proposal: null }),
			);
			vi.spyOn(coachModel, "createCoachModel").mockReturnValue(model);

			const assistantRow = {
				id: 1,
				conversationId,
				role: "assistant",
				content: "了解しました。",
				proposal: null,
				createdAt: "",
			};
			const batchSpy = vi
				.spyOn(db, "batch")
				.mockResolvedValue([[], [assistantRow]] as unknown as Awaited<ReturnType<typeof db.batch>>);

			const { uiStream, persistTurn } = await service.startMessageStream(
				userId,
				conversationId,
				"こんにちは",
				{ GEMINI_API_KEY: "dummy" } as Bindings,
			);

			await drainStream(uiStream);
			const assistantMessage = await persistTurn();

			expect(insertStmtSpy).toHaveBeenCalledWith(
				expect.objectContaining({ conversationId, role: "user", content: "こんにちは" }),
			);
			expect(insertStmtSpy).toHaveBeenCalledWith(
				expect.objectContaining({ conversationId, role: "assistant", content: "了解しました。" }),
			);
			expect(touchStmtSpy).toHaveBeenCalledWith(conversationId);

			// db.batch()には[userInsert, assistantInsert, touch]の3件が単一呼び出しで渡る。
			// 片方だけ成功して二重書き込み/孤立行が起きる状態を作らないことの保証。
			expect(batchSpy).toHaveBeenCalledTimes(1);
			expect(batchSpy.mock.calls[0][0]).toHaveLength(3);
			expect(assistantMessage).toEqual(assistantRow);
		});

		it("does not call db.batch when the model output fails schema validation", async () => {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);

			const conversationId = "conv-1";
			const userId = "user-1";

			const conversationRepo = (
				service as unknown as {
					conversationRepo: { findByIdAndUserId: (...args: unknown[]) => unknown };
				}
			).conversationRepo;
			const messageRepo = (
				service as unknown as {
					messageRepo: {
						countUserMessagesByUserIdSince: (...args: unknown[]) => unknown;
						findRecentByConversationId: (...args: unknown[]) => unknown;
					};
				}
			).messageRepo;
			const goalRepo = (
				service as unknown as {
					goalRepo: {
						findByIdAndUserId: (...args: unknown[]) => unknown;
						countActiveByUserId: (...args: unknown[]) => unknown;
					};
				}
			).goalRepo;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				kind: "exploration",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "countUserMessagesByUserIdSince").mockResolvedValue(0);
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([]);
			vi.spyOn(goalRepo, "findByIdAndUserId").mockResolvedValue(undefined);
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(0);

			const model = mockStreamModelReturning(JSON.stringify({ unexpected: "shape" }));
			vi.spyOn(coachModel, "createCoachModel").mockReturnValue(model);

			const batchSpy = vi.spyOn(db, "batch");

			const { uiStream, persistTurn } = await service.startMessageStream(
				userId,
				conversationId,
				"こんにちは",
				{ GEMINI_API_KEY: "dummy" } as Bindings,
			);

			await drainStream(uiStream);
			await expect(persistTurn()).rejects.toThrow("Coach chat model failed");

			expect(batchSpy).not.toHaveBeenCalled();
		});
	});

	describe("startOrGetExplorationConversation", () => {
		it("creates a new exploration conversation without calling the LLM when none exists", async () => {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);
			const userId = "user-1";

			const conversationRepo = (
				service as unknown as {
					conversationRepo: {
						findOpenExplorationByUserId: (...args: unknown[]) => unknown;
						createExploration: (...args: unknown[]) => unknown;
					};
				}
			).conversationRepo;
			const goalRepo = (
				service as unknown as { goalRepo: { countActiveByUserId: (...args: unknown[]) => unknown } }
			).goalRepo;

			vi.spyOn(conversationRepo, "findOpenExplorationByUserId").mockResolvedValue(undefined);
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(0);
			const createExplorationSpy = vi
				.spyOn(conversationRepo, "createExploration")
				.mockResolvedValue({
					id: "conv-1",
					userId,
					goalId: null,
					kind: "exploration",
					goalTitleSnapshot: "目標を決める相談",
					goalDeadlineSnapshot: null,
					createdAt: "",
					updatedAt: "",
				});
			const createModelSpy = vi.spyOn(coachModel, "createCoachModel");

			const result = await service.startOrGetExplorationConversation(userId);

			expect(createExplorationSpy).toHaveBeenCalledWith({
				userId,
				titleSnapshot: "目標を決める相談",
			});
			expect(result.isNew).toBe(true);
			expect(createModelSpy).not.toHaveBeenCalled();
		});

		it("throws GoalLimitExceededError before creating a conversation or calling the LLM when active goals are at the max", async () => {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);
			const userId = "user-1";

			const conversationRepo = (
				service as unknown as {
					conversationRepo: {
						findOpenExplorationByUserId: (...args: unknown[]) => unknown;
						createExploration: (...args: unknown[]) => unknown;
					};
				}
			).conversationRepo;
			const goalRepo = (
				service as unknown as { goalRepo: { countActiveByUserId: (...args: unknown[]) => unknown } }
			).goalRepo;

			vi.spyOn(conversationRepo, "findOpenExplorationByUserId").mockResolvedValue(undefined);
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(2);
			const createExplorationSpy = vi.spyOn(conversationRepo, "createExploration");
			const createModelSpy = vi.spyOn(coachModel, "createCoachModel");

			await expect(service.startOrGetExplorationConversation(userId)).rejects.toThrow(
				GoalLimitExceededError,
			);

			expect(createExplorationSpy).not.toHaveBeenCalled();
			expect(createModelSpy).not.toHaveBeenCalled();
		});

		it("returns the existing exploration conversation without creating a new one", async () => {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);
			const userId = "user-1";

			const conversationRepo = (
				service as unknown as {
					conversationRepo: {
						findOpenExplorationByUserId: (...args: unknown[]) => unknown;
						createExploration: (...args: unknown[]) => unknown;
					};
				}
			).conversationRepo;

			const existing = {
				id: "conv-1",
				userId,
				goalId: null,
				kind: "exploration",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			};
			vi.spyOn(conversationRepo, "findOpenExplorationByUserId").mockResolvedValue(existing);
			const createExplorationSpy = vi.spyOn(conversationRepo, "createExploration");

			const result = await service.startOrGetExplorationConversation(userId);

			expect(result).toEqual({ conversation: existing, isNew: false });
			expect(createExplorationSpy).not.toHaveBeenCalled();
		});
	});

	describe("startFirstTurnStream", () => {
		it("does not call the LLM when the conversation already has messages", async () => {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);
			const conversationId = "conv-1";
			const userId = "user-1";

			const conversationRepo = (
				service as unknown as {
					conversationRepo: { findByIdAndUserId: (...args: unknown[]) => unknown };
				}
			).conversationRepo;
			const messageRepo = (
				service as unknown as {
					messageRepo: { findRecentByConversationId: (...args: unknown[]) => unknown };
				}
			).messageRepo;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				kind: "exploration",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([
				{
					id: 1,
					conversationId,
					role: "assistant",
					content: "こんにちは",
					proposal: null,
					createdAt: "",
				},
			]);
			const createModelSpy = vi.spyOn(coachModel, "createCoachModel");

			const result = await service.startFirstTurnStream(userId, conversationId, {
				GEMINI_API_KEY: "dummy",
			} as Bindings);

			expect(result).toBeUndefined();
			expect(createModelSpy).not.toHaveBeenCalled();
		});

		it("generates and persists the first message only, with no user message, when the conversation is empty", async () => {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);
			const conversationId = "conv-1";
			const userId = "user-1";

			const conversationRepo = (
				service as unknown as {
					conversationRepo: {
						findByIdAndUserId: (...args: unknown[]) => unknown;
						touchStmt: (...args: unknown[]) => unknown;
					};
				}
			).conversationRepo;
			const messageRepo = (
				service as unknown as {
					messageRepo: {
						findRecentByConversationId: (...args: unknown[]) => unknown;
						insertStmt: (...args: unknown[]) => unknown;
					};
				}
			).messageRepo;
			const goalRepo = (
				service as unknown as { goalRepo: { countActiveByUserId: (...args: unknown[]) => unknown } }
			).goalRepo;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				kind: "exploration",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([]);
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(0);
			const insertStmtSpy = vi.spyOn(messageRepo, "insertStmt");
			const touchStmtSpy = vi.spyOn(conversationRepo, "touchStmt");

			const model = mockStreamModelReturning(
				JSON.stringify({ reply: "何にワクワクするペン", proposal: null }),
			);
			vi.spyOn(coachModel, "createCoachModel").mockReturnValue(model);

			const assistantRow = {
				id: 1,
				conversationId,
				role: "assistant",
				content: "何にワクワクするペン",
				proposal: null,
				createdAt: "",
			};
			const batchSpy = vi
				.spyOn(db, "batch")
				.mockResolvedValue([[assistantRow]] as unknown as Awaited<ReturnType<typeof db.batch>>);

			const result = await service.startFirstTurnStream(userId, conversationId, {
				GEMINI_API_KEY: "dummy",
			} as Bindings);
			if (!result) throw new Error("expected a result");

			await drainStream(result.uiStream);
			const assistantMessage = await result.persistTurn();

			expect(insertStmtSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					conversationId,
					role: "assistant",
					content: "何にワクワクするペン",
				}),
			);
			expect(insertStmtSpy).not.toHaveBeenCalledWith(expect.objectContaining({ role: "user" }));
			expect(touchStmtSpy).toHaveBeenCalledWith(conversationId);
			expect(batchSpy.mock.calls[0][0]).toHaveLength(2);
			expect(assistantMessage).toEqual(assistantRow);
		});
	});

	describe("adoptObjective", () => {
		function setupAdoptObjective() {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);
			const messageId = 1;
			const userId = "user-1";
			const conversationId = "conv-1";

			const messageRepo = (
				service as unknown as {
					messageRepo: {
						findById: (...args: unknown[]) => unknown;
						updateProposalStmt: (...args: unknown[]) => unknown;
					};
				}
			).messageRepo;
			const conversationRepo = (
				service as unknown as {
					conversationRepo: {
						findByIdAndUserId: (...args: unknown[]) => unknown;
						linkGoalStmt: (...args: unknown[]) => unknown;
					};
				}
			).conversationRepo;
			const goalRepo = (
				service as unknown as {
					goalRepo: {
						countActiveByUserId: (...args: unknown[]) => unknown;
						insertStmt: (...args: unknown[]) => unknown;
					};
				}
			).goalRepo;
			const categoryRepo = (
				service as unknown as {
					categoryRepo: {
						findByUserIdAndName: (...args: unknown[]) => unknown;
						createDefaultCategories: (...args: unknown[]) => unknown;
					};
				}
			).categoryRepo;

			return {
				db,
				service,
				messageId,
				userId,
				conversationId,
				messageRepo,
				conversationRepo,
				goalRepo,
				categoryRepo,
			};
		}

		const proposalWithObjective = JSON.stringify({
			version: 1,
			objective: { title: "資格を取得する", deadline: "2026-12-31", category: "study" },
			keyResults: [{ title: "模試900点", targetValue: 900, unit: "点", adopted: false }],
			todos: [],
		});

		it("adopts the objective and creates the goal + key results atomically", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				messageRepo,
				conversationRepo,
				goalRepo,
				categoryRepo,
			} = setupAdoptObjective();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "この目標にしましょう。",
				proposal: proposalWithObjective,
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				kind: "exploration",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(0);
			vi.spyOn(categoryRepo, "findByUserIdAndName").mockResolvedValue({
				id: "cat-1",
				userId,
				name: "学習",
				color: "#3B82F6",
				sortOrder: 0,
				createdAt: "",
				updatedAt: "",
			});

			const createdGoal = {
				id: "goal-1",
				userId,
				title: "資格を取得する",
				description: null,
				categoryId: "cat-1",
				status: "active",
				dueDate: "2026-12-31",
				completedAt: null,
				createdAt: "",
				updatedAt: "",
			};
			const batchSpy = vi
				.spyOn(db, "batch")
				.mockResolvedValue([[createdGoal]] as unknown as Awaited<ReturnType<typeof db.batch>>);

			const result = await service.adoptObjective(userId, messageId);

			expect(batchSpy).toHaveBeenCalledTimes(1);
			expect(batchSpy.mock.calls[0][0]).toHaveLength(4);
			expect(result.goal.title).toBe("資格を取得する");
			expect(result.proposal.keyResults[0].adopted).toBe(true);
		});

		it("falls back to the default deadline when the LLM returns a past date", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				messageRepo,
				conversationRepo,
				goalRepo,
				categoryRepo,
			} = setupAdoptObjective();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "この目標にしましょう。",
				proposal: JSON.stringify({
					version: 1,
					// LLMが過去日付を返した想定
					objective: { title: "資格を取得する", deadline: "2020-01-01", category: "study" },
					keyResults: [{ title: "模試900点", targetValue: 900, unit: "点", adopted: false }],
					todos: [],
				}),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				kind: "exploration",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(0);
			vi.spyOn(categoryRepo, "findByUserIdAndName").mockResolvedValue({
				id: "cat-1",
				userId,
				name: "学習",
				color: "#3B82F6",
				sortOrder: 0,
				createdAt: "",
				updatedAt: "",
			});

			const insertStmtSpy = vi.spyOn(goalRepo, "insertStmt");
			vi.spyOn(db, "batch").mockResolvedValue([
				[{ id: "goal-1", userId, title: "資格を取得する" }],
			] as unknown as Awaited<ReturnType<typeof db.batch>>);

			await service.adoptObjective(userId, messageId);

			const insertedGoal = insertStmtSpy.mock.calls[0][0] as { dueDate?: string };
			const today = new Date().toISOString().slice(0, 10);
			expect(insertedGoal.dueDate).not.toBe("2020-01-01");
			expect(insertedGoal.dueDate).toBeDefined();
			expect((insertedGoal.dueDate as string) > today).toBe(true);
		});

		it("throws GoalLimitExceededError when active goals are at the max", async () => {
			const {
				service,
				messageId,
				userId,
				conversationId,
				messageRepo,
				conversationRepo,
				goalRepo,
			} = setupAdoptObjective();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "この目標にしましょう。",
				proposal: proposalWithObjective,
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				kind: "exploration",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(2);

			await expect(service.adoptObjective(userId, messageId)).rejects.toThrow(
				GoalLimitExceededError,
			);
		});

		it("throws ObjectiveAlreadyAdoptedError when the key results are already adopted", async () => {
			const { service, messageId, userId, conversationId, messageRepo, conversationRepo } =
				setupAdoptObjective();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "この目標にしましょう。",
				proposal: JSON.stringify({
					version: 1,
					objective: { title: "資格を取得する", deadline: "2026-12-31", category: "study" },
					keyResults: [
						{
							title: "模試900点",
							targetValue: 900,
							unit: "点",
							adopted: true,
							createdMilestoneId: "m1",
						},
					],
					todos: [],
				}),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				kind: "exploration",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});

			await expect(service.adoptObjective(userId, messageId)).rejects.toThrow(
				ObjectiveAlreadyAdoptedError,
			);
		});

		it("throws ExplorationThreadAlreadyLinkedError when the conversation is already linked to a goal", async () => {
			const { service, messageId, userId, conversationId, messageRepo, conversationRepo } =
				setupAdoptObjective();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "この目標にしましょう。",
				proposal: proposalWithObjective,
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: "goal-already-linked",
				kind: "goal",
				goalTitleSnapshot: "資格を取得する",
				goalDeadlineSnapshot: "2026-12-31",
				createdAt: "",
				updatedAt: "",
			});

			await expect(service.adoptObjective(userId, messageId)).rejects.toThrow(
				ExplorationThreadAlreadyLinkedError,
			);
		});

		it("throws PlanItemNotFoundError when the proposal has no objective", async () => {
			const { service, messageId, userId, conversationId, messageRepo, conversationRepo } =
				setupAdoptObjective();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "もう少し聞かせて。",
				proposal: JSON.stringify({ version: 1, objective: null, keyResults: [], todos: [] }),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				kind: "exploration",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});

			await expect(service.adoptObjective(userId, messageId)).rejects.toThrow(
				PlanItemNotFoundError,
			);
		});

		it("他人のmessage(所有権不成立)は存在しない場合と同じPlanItemNotFoundErrorにする(列挙オラクル防止)", async () => {
			const { service, messageId, userId, conversationId, messageRepo, conversationRepo } =
				setupAdoptObjective();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "この目標にしましょう。",
				proposal: proposalWithObjective,
				createdAt: "",
			});
			// findByIdAndUserIdがundefined = 他人のmessage(所有権なし)
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue(undefined);

			await expect(service.adoptObjective(userId, messageId)).rejects.toThrow(
				PlanItemNotFoundError,
			);
		});
	});
});
