import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ExplorationThreadAlreadyLinkedError,
	GoalLimitExceededError,
	MilestoneUpdateStaleError,
	ObjectiveAlreadyAdoptedError,
	PlanItemAlreadyAdoptedError,
	PlanItemNotFoundError,
	TodoUpdateStaleError,
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
					controller.enqueue({
						type: "text-delta",
						id: "1",
						delta: objectText,
					});
					controller.enqueue({ type: "text-end", id: "1" });
					controller.enqueue({
						type: "finish",
						finishReason: { unified: "stop", raw: undefined },
						usage: {
							inputTokens: {
								total: 10,
								noCache: 10,
								cacheRead: undefined,
								cacheWrite: undefined,
							},
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
			const chatGate = (
				service as unknown as {
					chatGate: {
						resolveForUndecidedMessage: (...args: unknown[]) => unknown;
					};
				}
			).chatGate;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				objectiveStatus: "undecided",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([]);
			vi.spyOn(goalRepo, "findByIdAndUserId").mockResolvedValue(undefined);
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(0);
			vi.spyOn(chatGate, "resolveForUndecidedMessage").mockResolvedValue("gemini-3.5-flash-lite");

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
				expect.objectContaining({
					conversationId,
					role: "user",
					content: "こんにちは",
				}),
			);
			expect(insertStmtSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					conversationId,
					role: "assistant",
					content: "了解しました。",
				}),
			);
			expect(touchStmtSpy).toHaveBeenCalledWith(conversationId);

			// db.batch()には[userInsert, assistantInsert, touch]の3件が単一呼び出しで渡る。
			// 片方だけ成功して二重書き込み/孤立行が起きる状態を作らないことの保証。
			expect(batchSpy).toHaveBeenCalledTimes(1);
			expect(batchSpy.mock.calls[0][0]).toHaveLength(3);
			expect(assistantMessage).toEqual(assistantRow);
		});

		it("resolves and persists the next phase via setPhaseStmt on a decided (goal) thread", async () => {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);

			const conversationId = "conv-1";
			const userId = "user-1";
			const goalId = "goal-1";

			const conversationRepo = (
				service as unknown as {
					conversationRepo: {
						findByIdAndUserId: (...args: unknown[]) => unknown;
						touchStmt: (...args: unknown[]) => unknown;
						setPhaseStmt: (...args: unknown[]) => unknown;
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
				service as unknown as {
					goalRepo: { findByIdAndUserId: (...args: unknown[]) => unknown };
				}
			).goalRepo;
			const milestoneRepo = (
				service as unknown as {
					milestoneRepo: { findAllByGoalId: (...args: unknown[]) => unknown };
				}
			).milestoneRepo;
			const todoRepo = (
				service as unknown as {
					todoRepo: { findAllByGoalId: (...args: unknown[]) => unknown };
				}
			).todoRepo;
			const todoLogRepo = (
				service as unknown as {
					todoLogRepo: { findAllByTodoIds: (...args: unknown[]) => unknown };
				}
			).todoLogRepo;
			const chatGate = (
				service as unknown as {
					chatGate: {
						resolveForDecidedMessage: (...args: unknown[]) => unknown;
					};
				}
			).chatGate;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId,
				objectiveStatus: "decided",
				goalTitleSnapshot: "資格を取得する",
				goalDeadlineSnapshot: "2026-12-31",
				phase: "reality",
				turnsInPhase: 0,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([]);
			vi.spyOn(goalRepo, "findByIdAndUserId").mockResolvedValue({
				id: goalId,
				title: "資格を取得する",
				dueDate: "2026-12-31",
			});
			vi.spyOn(milestoneRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(todoRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(todoLogRepo, "findAllByTodoIds").mockResolvedValue([]);
			vi.spyOn(chatGate, "resolveForDecidedMessage").mockResolvedValue({
				modelId: "gemini-3.5-flash-lite",
				blocked: false,
			});

			const insertStmtSpy = vi.spyOn(messageRepo, "insertStmt");
			const touchStmtSpy = vi.spyOn(conversationRepo, "touchStmt");
			const setPhaseStmtSpy = vi.spyOn(conversationRepo, "setPhaseStmt");

			const model = mockStreamModelReturning(
				JSON.stringify({
					reply: "現状を教えてほしい。",
					proposal: null,
					phase: "insight",
				}),
			);
			vi.spyOn(coachModel, "createCoachModel").mockReturnValue(model);

			const assistantRow = {
				id: 1,
				conversationId,
				role: "assistant",
				content: "現状を教えてほしい。",
				proposal: null,
				createdAt: "",
			};
			const batchSpy = vi
				.spyOn(db, "batch")
				.mockResolvedValue([[], [assistantRow]] as unknown as Awaited<ReturnType<typeof db.batch>>);

			const { uiStream, persistTurn } = await service.startMessageStream(
				userId,
				conversationId,
				"最近進んでいない",
				{ GEMINI_API_KEY: "dummy" } as Bindings,
			);

			await drainStream(uiStream);
			await persistTurn();

			expect(insertStmtSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					conversationId,
					role: "user",
					content: "最近進んでいない",
				}),
			);
			// declaredPhase("insight")はcurrent("reality")から1段階前進のため矯正されずそのまま適用される
			expect(setPhaseStmtSpy).toHaveBeenCalledWith(conversationId, "insight", 0);
			expect(touchStmtSpy).not.toHaveBeenCalled();
			expect(batchSpy).toHaveBeenCalledTimes(1);
			expect(batchSpy.mock.calls[0][0]).toHaveLength(3);
		});

		it("does not call db.batch when the model output fails schema validation", async () => {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);

			const conversationId = "conv-1";
			const userId = "user-1";

			const conversationRepo = (
				service as unknown as {
					conversationRepo: {
						findByIdAndUserId: (...args: unknown[]) => unknown;
					};
				}
			).conversationRepo;
			const messageRepo = (
				service as unknown as {
					messageRepo: {
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
			const chatGate = (
				service as unknown as {
					chatGate: {
						resolveForUndecidedMessage: (...args: unknown[]) => unknown;
					};
				}
			).chatGate;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				objectiveStatus: "undecided",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([]);
			vi.spyOn(goalRepo, "findByIdAndUserId").mockResolvedValue(undefined);
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(0);
			vi.spyOn(chatGate, "resolveForUndecidedMessage").mockResolvedValue("gemini-3.5-flash-lite");

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

		it("releases the daily usage reservation when the LLM call fails on a decided thread (so a failed turn doesn't cost the user a message)", async () => {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);

			const conversationId = "conv-1";
			const userId = "user-1";
			const goalId = "goal-1";

			const conversationRepo = (
				service as unknown as {
					conversationRepo: {
						findByIdAndUserId: (...args: unknown[]) => unknown;
					};
				}
			).conversationRepo;
			const messageRepo = (
				service as unknown as {
					messageRepo: {
						findRecentByConversationId: (...args: unknown[]) => unknown;
					};
				}
			).messageRepo;
			const goalRepo = (
				service as unknown as {
					goalRepo: { findByIdAndUserId: (...args: unknown[]) => unknown };
				}
			).goalRepo;
			const milestoneRepo = (
				service as unknown as {
					milestoneRepo: { findAllByGoalId: (...args: unknown[]) => unknown };
				}
			).milestoneRepo;
			const todoRepo = (
				service as unknown as {
					todoRepo: { findAllByGoalId: (...args: unknown[]) => unknown };
				}
			).todoRepo;
			const todoLogRepo = (
				service as unknown as {
					todoLogRepo: { findAllByTodoIds: (...args: unknown[]) => unknown };
				}
			).todoLogRepo;
			const chatGate = (
				service as unknown as {
					chatGate: {
						resolveForDecidedMessage: (...args: unknown[]) => unknown;
						releaseDecidedMessageReservation: (...args: unknown[]) => unknown;
					};
				}
			).chatGate;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId,
				objectiveStatus: "decided",
				goalTitleSnapshot: "資格を取得する",
				goalDeadlineSnapshot: "2026-12-31",
				phase: "reality",
				turnsInPhase: 0,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([]);
			vi.spyOn(goalRepo, "findByIdAndUserId").mockResolvedValue({
				id: goalId,
				title: "資格を取得する",
				dueDate: "2026-12-31",
			});
			vi.spyOn(milestoneRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(todoRepo, "findAllByGoalId").mockResolvedValue([]);
			vi.spyOn(todoLogRepo, "findAllByTodoIds").mockResolvedValue([]);
			vi.spyOn(chatGate, "resolveForDecidedMessage").mockResolvedValue({
				modelId: "gemini-3.5-flash-lite",
				blocked: false,
			});
			const releaseSpy = vi
				.spyOn(chatGate, "releaseDecidedMessageReservation")
				.mockResolvedValue(undefined);

			const model = mockStreamModelReturning(JSON.stringify({ unexpected: "shape" }));
			vi.spyOn(coachModel, "createCoachModel").mockReturnValue(model);

			const { uiStream, persistTurn } = await service.startMessageStream(
				userId,
				conversationId,
				"最近進んでいない",
				{ GEMINI_API_KEY: "dummy" } as Bindings,
			);

			await drainStream(uiStream);
			await expect(persistTurn()).rejects.toThrow("Coach chat model failed");

			expect(releaseSpy).toHaveBeenCalledWith(userId, expect.any(String));
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
				service as unknown as {
					goalRepo: { countActiveByUserId: (...args: unknown[]) => unknown };
				}
			).goalRepo;

			vi.spyOn(conversationRepo, "findOpenExplorationByUserId").mockResolvedValue(undefined);
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(0);
			const createExplorationSpy = vi
				.spyOn(conversationRepo, "createExploration")
				.mockResolvedValue({
					id: "conv-1",
					userId,
					goalId: null,
					objectiveStatus: "undecided",
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
				service as unknown as {
					goalRepo: { countActiveByUserId: (...args: unknown[]) => unknown };
				}
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
				objectiveStatus: "undecided",
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
					conversationRepo: {
						findByIdAndUserId: (...args: unknown[]) => unknown;
					};
				}
			).conversationRepo;
			const messageRepo = (
				service as unknown as {
					messageRepo: {
						findRecentByConversationId: (...args: unknown[]) => unknown;
					};
				}
			).messageRepo;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				objectiveStatus: "undecided",
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
				service as unknown as {
					goalRepo: { countActiveByUserId: (...args: unknown[]) => unknown };
				}
			).goalRepo;
			const chatGate = (
				service as unknown as {
					chatGate: {
						resolveForUndecidedMessage: (...args: unknown[]) => unknown;
					};
				}
			).chatGate;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				objectiveStatus: "undecided",
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([]);
			vi.spyOn(goalRepo, "countActiveByUserId").mockResolvedValue(0);
			vi.spyOn(chatGate, "resolveForUndecidedMessage").mockResolvedValue("gemini-3.5-flash-lite");
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
			objective: {
				title: "資格を取得する",
				deadline: "2026-12-31",
				category: "study",
			},
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
				objectiveStatus: "undecided",
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
					objective: {
						title: "資格を取得する",
						deadline: "2020-01-01",
						category: "study",
					},
					keyResults: [
						{
							title: "模試900点",
							targetValue: 900,
							unit: "点",
							adopted: false,
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
				objectiveStatus: "undecided",
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

			const insertedGoal = insertStmtSpy.mock.calls[0][0] as {
				dueDate?: string;
			};
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
				objectiveStatus: "undecided",
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
					objective: {
						title: "資格を取得する",
						deadline: "2026-12-31",
						category: "study",
					},
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
				objectiveStatus: "undecided",
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
				objectiveStatus: "decided",
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
				proposal: JSON.stringify({
					version: 1,
					objective: null,
					keyResults: [],
					todos: [],
				}),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				objectiveStatus: "undecided",
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

	describe("adoptPlanItem (milestoneUpdate)", () => {
		function setupAdoptPlanItem() {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);
			const messageId = 1;
			const userId = "user-1";
			const conversationId = "conv-1";
			const goalId = "goal-1";
			const milestoneId = "milestone-1";

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
					};
				}
			).conversationRepo;
			const milestoneRepo = (
				service as unknown as {
					milestoneRepo: {
						findById: (...args: unknown[]) => unknown;
						updateStmt: (...args: unknown[]) => unknown;
					};
				}
			).milestoneRepo;

			return {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				milestoneId,
				messageRepo,
				conversationRepo,
				milestoneRepo,
			};
		}

		function proposalWithMilestoneUpdate(baselineCurrentValue = 500) {
			return JSON.stringify({
				version: 1,
				objective: null,
				keyResults: [],
				todos: [],
				milestoneUpdates: [
					{
						milestoneId: "milestone-1",
						milestoneTitle: "模試900点",
						baselineCurrentValue,
						suggestedCurrentValue: 700,
						reason: "TODOの完了ペースから推定",
						adopted: false,
					},
				],
			});
		}

		it("suggestedCurrentValueをmilestoneのcurrentValueに反映し、proposalをadopted=trueに更新する", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				milestoneId,
				messageRepo,
				conversationRepo,
				milestoneRepo,
			} = setupAdoptPlanItem();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "現在のペースだと推定700点だ。",
				proposal: proposalWithMilestoneUpdate(),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId,
				objectiveStatus: "decided",
				goalTitleSnapshot: "TOEIC800点を取る",
				goalDeadlineSnapshot: "2026-12-31",
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(milestoneRepo, "findById").mockResolvedValue({
				id: milestoneId,
				goalId,
				title: "模試900点",
				startValue: 0,
				currentValue: 500,
				targetValue: 900,
				unit: "点",
				isCompleted: 0,
			});

			const updatedMilestone = {
				id: milestoneId,
				goalId,
				title: "模試900点",
				startValue: 0,
				currentValue: 700,
				targetValue: 900,
				unit: "点",
				isCompleted: 0,
			};
			const updateStmtSpy = vi.spyOn(milestoneRepo, "updateStmt");
			const batchSpy = vi
				.spyOn(db, "batch")
				.mockResolvedValue([[updatedMilestone]] as unknown as Awaited<ReturnType<typeof db.batch>>);

			const result = await service.adoptPlanItem(userId, messageId, {
				type: "milestoneUpdate",
				milestoneUpdateIndex: 0,
			});

			expect(updateStmtSpy).toHaveBeenCalledWith(milestoneId, {
				currentValue: 700,
				isCompleted: 0,
				completedAt: null,
			});
			expect(batchSpy).toHaveBeenCalledTimes(1);
			expect(result.proposal.milestoneUpdates[0]).toEqual({
				milestoneId,
				milestoneTitle: "模試900点",
				baselineCurrentValue: 500,
				suggestedCurrentValue: 700,
				reason: "TODOの完了ペースから推定",
				adopted: true,
				appliedCurrentValue: 700,
			});
			expect(result.milestone?.currentValue).toBe(700);
		});

		it("targetValue以上への反映はisCompleted=1・completedAtを設定する", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				milestoneId,
				messageRepo,
				conversationRepo,
				milestoneRepo,
			} = setupAdoptPlanItem();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "目標達成ペースだ。",
				proposal: JSON.stringify({
					version: 1,
					objective: null,
					keyResults: [],
					todos: [],
					milestoneUpdates: [
						{
							milestoneId,
							milestoneTitle: "模試900点",
							baselineCurrentValue: 500,
							suggestedCurrentValue: 900,
							reason: "既に目標水準に到達",
							adopted: false,
						},
					],
				}),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId,
				objectiveStatus: "decided",
				goalTitleSnapshot: "TOEIC800点を取る",
				goalDeadlineSnapshot: "2026-12-31",
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(milestoneRepo, "findById").mockResolvedValue({
				id: milestoneId,
				goalId,
				title: "模試900点",
				startValue: 0,
				currentValue: 500,
				targetValue: 900,
				unit: "点",
				isCompleted: 0,
			});
			const updateStmtSpy = vi.spyOn(milestoneRepo, "updateStmt");
			vi.spyOn(db, "batch").mockResolvedValue([
				[{ id: milestoneId, currentValue: 900, isCompleted: 1 }],
			] as unknown as Awaited<ReturnType<typeof db.batch>>);

			await service.adoptPlanItem(userId, messageId, {
				type: "milestoneUpdate",
				milestoneUpdateIndex: 0,
			});

			expect(updateStmtSpy).toHaveBeenCalledWith(
				milestoneId,
				expect.objectContaining({ currentValue: 900, isCompleted: 1 }),
			);
		});

		it("既に採用済みのmilestoneUpdateはPlanItemAlreadyAdoptedErrorを投げる", async () => {
			const { service, messageId, userId, conversationId, goalId, messageRepo, conversationRepo } =
				setupAdoptPlanItem();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "現在のペースだと推定700点だ。",
				proposal: JSON.stringify({
					version: 1,
					objective: null,
					keyResults: [],
					todos: [],
					milestoneUpdates: [
						{
							milestoneId: "milestone-1",
							milestoneTitle: "模試900点",
							baselineCurrentValue: 500,
							suggestedCurrentValue: 700,
							reason: "TODOの完了ペースから推定",
							adopted: true,
							appliedCurrentValue: 700,
						},
					],
				}),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId,
				objectiveStatus: "decided",
				goalTitleSnapshot: "TOEIC800点を取る",
				goalDeadlineSnapshot: "2026-12-31",
				createdAt: "",
				updatedAt: "",
			});

			await expect(
				service.adoptPlanItem(userId, messageId, {
					type: "milestoneUpdate",
					milestoneUpdateIndex: 0,
				}),
			).rejects.toThrow(PlanItemAlreadyAdoptedError);
		});

		it("milestoneが別goal所属(IDOR)の場合はPlanItemNotFoundErrorにする", async () => {
			const {
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				milestoneId,
				messageRepo,
				conversationRepo,
				milestoneRepo,
			} = setupAdoptPlanItem();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "現在のペースだと推定700点だ。",
				proposal: proposalWithMilestoneUpdate(),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId,
				objectiveStatus: "decided",
				goalTitleSnapshot: "TOEIC800点を取る",
				goalDeadlineSnapshot: "2026-12-31",
				createdAt: "",
				updatedAt: "",
			});
			// milestoneが別のgoalIdに属している(不正なmilestoneId指定を想定)
			vi.spyOn(milestoneRepo, "findById").mockResolvedValue({
				id: milestoneId,
				goalId: "other-goal",
				title: "模試900点",
				startValue: 0,
				currentValue: 500,
				targetValue: 900,
				unit: "点",
				isCompleted: 0,
			});

			await expect(
				service.adoptPlanItem(userId, messageId, {
					type: "milestoneUpdate",
					milestoneUpdateIndex: 0,
				}),
			).rejects.toThrow(PlanItemNotFoundError);
		});

		it("存在しないmilestoneUpdateIndexはPlanItemNotFoundErrorにする", async () => {
			const { service, messageId, userId, conversationId, goalId, messageRepo, conversationRepo } =
				setupAdoptPlanItem();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "現在のペースだと推定700点だ。",
				proposal: proposalWithMilestoneUpdate(),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId,
				objectiveStatus: "decided",
				goalTitleSnapshot: "TOEIC800点を取る",
				goalDeadlineSnapshot: "2026-12-31",
				createdAt: "",
				updatedAt: "",
			});

			await expect(
				service.adoptPlanItem(userId, messageId, {
					type: "milestoneUpdate",
					milestoneUpdateIndex: 5,
				}),
			).rejects.toThrow(PlanItemNotFoundError);
		});

		it("提案生成後にcurrentValueが手動更新されている場合はMilestoneUpdateStaleErrorにする(古い提案での上書き事故を防ぐ)", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				milestoneId,
				messageRepo,
				conversationRepo,
				milestoneRepo,
			} = setupAdoptPlanItem();

			// baselineCurrentValue(提案生成時点)は500だが、その後ユーザーが「+更新」で800に変更済み
			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "現在のペースだと推定700点だ。",
				proposal: proposalWithMilestoneUpdate(500),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId,
				objectiveStatus: "decided",
				goalTitleSnapshot: "TOEIC800点を取る",
				goalDeadlineSnapshot: "2026-12-31",
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(milestoneRepo, "findById").mockResolvedValue({
				id: milestoneId,
				goalId,
				title: "模試900点",
				startValue: 0,
				currentValue: 800,
				targetValue: 900,
				unit: "点",
				isCompleted: 0,
			});
			const batchSpy = vi.spyOn(db, "batch");

			await expect(
				service.adoptPlanItem(userId, messageId, {
					type: "milestoneUpdate",
					milestoneUpdateIndex: 0,
				}),
			).rejects.toThrow(MilestoneUpdateStaleError);
			expect(batchSpy).not.toHaveBeenCalled();
		});
	});

	describe("adoptPlanItem (todoUpdate)", () => {
		function setupAdoptTodoUpdate() {
			const db = createDb(createUnusedD1());
			const service = new CoachChatService(db);
			const messageId = 1;
			const userId = "user-1";
			const conversationId = "conv-1";
			const goalId = "goal-1";
			const todoId = "todo-1";

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
					};
				}
			).conversationRepo;
			const todoRepo = (
				service as unknown as {
					todoRepo: {
						findById: (...args: unknown[]) => unknown;
						updateStmt: (...args: unknown[]) => unknown;
						deleteStmt: (...args: unknown[]) => unknown;
					};
				}
			).todoRepo;
			const todoLogRepo = (
				service as unknown as {
					todoLogRepo: {
						countCompletedByTodoIds: (...args: unknown[]) => unknown;
					};
				}
			).todoLogRepo;

			return {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				todoId,
				messageRepo,
				conversationRepo,
				todoRepo,
				todoLogRepo,
			};
		}

		function proposalWithTodoUpdate(overrides: Record<string, unknown> = {}) {
			return JSON.stringify({
				version: 1,
				objective: null,
				keyResults: [],
				todos: [],
				milestoneUpdates: [],
				todoUpdates: [
					{
						todoId: "todo-1",
						todoTitle: "過去問を1日1回演習する",
						baselineDueDate: "2026-08-01",
						suggestedDueDate: "2026-09-01",
						reason: "期限超過が続いている",
						adopted: false,
						...overrides,
					},
				],
			});
		}

		function mockConversation(conversationId: string, userId: string, goalId: string) {
			return {
				id: conversationId,
				userId,
				goalId,
				objectiveStatus: "decided" as const,
				goalTitleSnapshot: "TOEIC800点を取る",
				goalDeadlineSnapshot: "2026-12-31",
				createdAt: "",
				updatedAt: "",
			};
		}

		it("suggestedDueDateをtodoのdueDateに反映し、proposalをadopted=trueに更新する", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				todoId,
				messageRepo,
				conversationRepo,
				todoRepo,
				todoLogRepo,
			} = setupAdoptTodoUpdate();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "期限を見直すべきだ。",
				proposal: proposalWithTodoUpdate(),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue(
				mockConversation(conversationId, userId, goalId),
			);
			vi.spyOn(todoRepo, "findById").mockResolvedValue({
				id: todoId,
				goalId,
				title: "過去問を1日1回演習する",
				dueDate: "2026-08-01",
				priority: "medium",
				isCompleted: 0,
			});
			vi.spyOn(todoLogRepo, "countCompletedByTodoIds").mockResolvedValue(new Map());

			const updatedTodo = {
				id: todoId,
				goalId,
				milestoneId: null,
				title: "過去問を1日1回演習する",
				description: null,
				dueDate: "2026-09-01",
				estimatedMinutes: null,
				priority: "medium",
				taskType: "daily",
				isCompleted: 0,
				isAiGenerated: 0,
				createdAt: "",
			};
			const updateStmtSpy = vi.spyOn(todoRepo, "updateStmt");
			const batchSpy = vi
				.spyOn(db, "batch")
				.mockResolvedValue([[updatedTodo]] as unknown as Awaited<ReturnType<typeof db.batch>>);

			const result = await service.adoptPlanItem(userId, messageId, {
				type: "todoUpdate",
				todoUpdateIndex: 0,
			});

			expect(updateStmtSpy).toHaveBeenCalledWith(todoId, { dueDate: "2026-09-01" });
			expect(batchSpy).toHaveBeenCalledTimes(1);
			expect(result.proposal.todoUpdates[0].adopted).toBe(true);
			expect(result.todo?.dueDate).toBe("2026-09-01");
		});

		it("suggestedAction=completeはisCompleted/completedAtを更新する", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				todoId,
				messageRepo,
				conversationRepo,
				todoRepo,
				todoLogRepo,
			} = setupAdoptTodoUpdate();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "もう完了扱いにしてよい。",
				proposal: proposalWithTodoUpdate({
					baselineDueDate: undefined,
					suggestedDueDate: undefined,
					suggestedAction: "complete",
				}),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue(
				mockConversation(conversationId, userId, goalId),
			);
			vi.spyOn(todoRepo, "findById").mockResolvedValue({
				id: todoId,
				goalId,
				title: "過去問を1日1回演習する",
				dueDate: "2026-08-01",
				priority: "medium",
				isCompleted: 0,
			});
			vi.spyOn(todoLogRepo, "countCompletedByTodoIds").mockResolvedValue(new Map());
			const updateStmtSpy = vi.spyOn(todoRepo, "updateStmt");
			vi.spyOn(db, "batch").mockResolvedValue([
				[{ id: todoId, goalId, title: "過去問を1日1回演習する", isCompleted: 1 }],
			] as unknown as Awaited<ReturnType<typeof db.batch>>);

			await service.adoptPlanItem(userId, messageId, {
				type: "todoUpdate",
				todoUpdateIndex: 0,
			});

			expect(updateStmtSpy).toHaveBeenCalledWith(
				todoId,
				expect.objectContaining({ isCompleted: 1 }),
			);
		});

		it("suggestedAction=deleteはtodoを削除しレスポンスにtodoを含めない", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				todoId,
				messageRepo,
				conversationRepo,
				todoRepo,
			} = setupAdoptTodoUpdate();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "もう不要なので削除する。",
				proposal: proposalWithTodoUpdate({
					baselineDueDate: undefined,
					suggestedDueDate: undefined,
					suggestedAction: "delete",
				}),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue(
				mockConversation(conversationId, userId, goalId),
			);
			vi.spyOn(todoRepo, "findById").mockResolvedValue({
				id: todoId,
				goalId,
				title: "過去問を1日1回演習する",
				dueDate: "2026-08-01",
				priority: "medium",
				isCompleted: 0,
			});
			const deleteStmtSpy = vi.spyOn(todoRepo, "deleteStmt");
			const batchSpy = vi
				.spyOn(db, "batch")
				.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof db.batch>>);

			const result = await service.adoptPlanItem(userId, messageId, {
				type: "todoUpdate",
				todoUpdateIndex: 0,
			});

			expect(deleteStmtSpy).toHaveBeenCalledWith(todoId);
			expect(batchSpy).toHaveBeenCalledTimes(1);
			expect(result.todo).toBeUndefined();
		});

		it("suggestedAction=deleteの対象TODOのタイトルが提案生成後に変化している場合はTodoUpdateStaleErrorにする", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				todoId,
				messageRepo,
				conversationRepo,
				todoRepo,
			} = setupAdoptTodoUpdate();

			// baselineTitle(提案生成時点)は「過去問を1日1回演習する」だが、その後
			// ユーザーが手動でタイトルを変更済み。意図しない対象を削除してしまう事故を防ぐ
			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "もう不要なので削除する。",
				proposal: proposalWithTodoUpdate({
					baselineDueDate: undefined,
					suggestedDueDate: undefined,
					baselineTitle: "過去問を1日1回演習する",
					suggestedAction: "delete",
				}),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue(
				mockConversation(conversationId, userId, goalId),
			);
			vi.spyOn(todoRepo, "findById").mockResolvedValue({
				id: todoId,
				goalId,
				title: "過去問を2日に1回演習する",
				dueDate: "2026-08-01",
				priority: "medium",
				isCompleted: 0,
			});
			const batchSpy = vi.spyOn(db, "batch");

			await expect(
				service.adoptPlanItem(userId, messageId, {
					type: "todoUpdate",
					todoUpdateIndex: 0,
				}),
			).rejects.toThrow(TodoUpdateStaleError);
			expect(batchSpy).not.toHaveBeenCalled();
		});

		it("既に採用済みのtodoUpdateはPlanItemAlreadyAdoptedErrorを投げる", async () => {
			const { service, messageId, userId, conversationId, goalId, messageRepo, conversationRepo } =
				setupAdoptTodoUpdate();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "期限を見直すべきだ。",
				proposal: proposalWithTodoUpdate({ adopted: true }),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue(
				mockConversation(conversationId, userId, goalId),
			);

			await expect(
				service.adoptPlanItem(userId, messageId, {
					type: "todoUpdate",
					todoUpdateIndex: 0,
				}),
			).rejects.toThrow(PlanItemAlreadyAdoptedError);
		});

		it("存在しないtodoUpdateIndexはPlanItemNotFoundErrorにする", async () => {
			const { service, messageId, userId, conversationId, goalId, messageRepo, conversationRepo } =
				setupAdoptTodoUpdate();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "期限を見直すべきだ。",
				proposal: proposalWithTodoUpdate(),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue(
				mockConversation(conversationId, userId, goalId),
			);

			await expect(
				service.adoptPlanItem(userId, messageId, {
					type: "todoUpdate",
					todoUpdateIndex: 5,
				}),
			).rejects.toThrow(PlanItemNotFoundError);
		});

		it("todoが別goal所属(IDOR)の場合はPlanItemNotFoundErrorにする", async () => {
			const {
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				todoId,
				messageRepo,
				conversationRepo,
				todoRepo,
			} = setupAdoptTodoUpdate();

			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "期限を見直すべきだ。",
				proposal: proposalWithTodoUpdate(),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue(
				mockConversation(conversationId, userId, goalId),
			);
			// todoが別のgoalIdに属している(不正なtodoId指定を想定)
			vi.spyOn(todoRepo, "findById").mockResolvedValue({
				id: todoId,
				goalId: "other-goal",
				title: "過去問を1日1回演習する",
				dueDate: "2026-08-01",
				priority: "medium",
				isCompleted: 0,
			});

			await expect(
				service.adoptPlanItem(userId, messageId, {
					type: "todoUpdate",
					todoUpdateIndex: 0,
				}),
			).rejects.toThrow(PlanItemNotFoundError);
		});

		it("提案対象フィールド(dueDate)が提案生成後に変化している場合はTodoUpdateStaleErrorにする", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				todoId,
				messageRepo,
				conversationRepo,
				todoRepo,
			} = setupAdoptTodoUpdate();

			// baselineDueDate(提案生成時点)は2026-08-01だが、その後ユーザーが手動で2026-08-15に変更済み
			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "期限を見直すべきだ。",
				proposal: proposalWithTodoUpdate(),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue(
				mockConversation(conversationId, userId, goalId),
			);
			vi.spyOn(todoRepo, "findById").mockResolvedValue({
				id: todoId,
				goalId,
				title: "過去問を1日1回演習する",
				dueDate: "2026-08-15",
				priority: "medium",
				isCompleted: 0,
			});
			const batchSpy = vi.spyOn(db, "batch");

			await expect(
				service.adoptPlanItem(userId, messageId, {
					type: "todoUpdate",
					todoUpdateIndex: 0,
				}),
			).rejects.toThrow(TodoUpdateStaleError);
			expect(batchSpy).not.toHaveBeenCalled();
		});

		it("提案対象外フィールド(priority)だけが変化している場合はstaleにならない(誤検知防止)", async () => {
			const {
				db,
				service,
				messageId,
				userId,
				conversationId,
				goalId,
				todoId,
				messageRepo,
				conversationRepo,
				todoRepo,
				todoLogRepo,
			} = setupAdoptTodoUpdate();

			// この提案はdueDateのみを対象にしている(baselinePriorityを持たない)。
			// priorityが並べ替え等の無関係な操作で変化していても競合検知してはならない
			vi.spyOn(messageRepo, "findById").mockResolvedValue({
				id: messageId,
				conversationId,
				role: "assistant",
				content: "期限を見直すべきだ。",
				proposal: proposalWithTodoUpdate(),
				createdAt: "",
			});
			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue(
				mockConversation(conversationId, userId, goalId),
			);
			vi.spyOn(todoRepo, "findById").mockResolvedValue({
				id: todoId,
				goalId,
				title: "過去問を1日1回演習する",
				dueDate: "2026-08-01",
				// priorityがbaseline("medium")と異なるが、この提案はpriorityを対象にしていない
				priority: "high",
				isCompleted: 0,
			});
			vi.spyOn(todoLogRepo, "countCompletedByTodoIds").mockResolvedValue(new Map());
			vi.spyOn(db, "batch").mockResolvedValue([
				[{ id: todoId, goalId, title: "過去問を1日1回演習する", dueDate: "2026-09-01" }],
			] as unknown as Awaited<ReturnType<typeof db.batch>>);

			await expect(
				service.adoptPlanItem(userId, messageId, {
					type: "todoUpdate",
					todoUpdateIndex: 0,
				}),
			).resolves.not.toThrow();
		});
	});
});
