import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
				service as unknown as { goalRepo: { findByIdAndUserId: (...args: unknown[]) => unknown } }
			).goalRepo;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "countUserMessagesByUserIdSince").mockResolvedValue(0);
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([]);
			vi.spyOn(goalRepo, "findByIdAndUserId").mockResolvedValue(undefined);

			const insertStmtSpy = vi.spyOn(messageRepo, "insertStmt");
			const touchStmtSpy = vi.spyOn(conversationRepo, "touchStmt");

			const model = mockStreamModelReturning(
				JSON.stringify({ reply: "了解しました。", planProposal: null }),
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
				service as unknown as { goalRepo: { findByIdAndUserId: (...args: unknown[]) => unknown } }
			).goalRepo;

			vi.spyOn(conversationRepo, "findByIdAndUserId").mockResolvedValue({
				id: conversationId,
				userId,
				goalId: null,
				goalTitleSnapshot: "目標を決める相談",
				goalDeadlineSnapshot: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "countUserMessagesByUserIdSince").mockResolvedValue(0);
			vi.spyOn(messageRepo, "findRecentByConversationId").mockResolvedValue([]);
			vi.spyOn(goalRepo, "findByIdAndUserId").mockResolvedValue(undefined);

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
});
