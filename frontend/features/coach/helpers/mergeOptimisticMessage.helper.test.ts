import { describe, expect, it } from "vitest";
import type { CoachMessage } from "../types";
import { createOptimisticMessage, mergeOptimisticMessage } from "./mergeOptimisticMessage.helper";

const CONVERSATION_ID = "conv-1";

const CONFIRMED_MESSAGES: CoachMessage[] = [
	{
		id: 1,
		conversationId: CONVERSATION_ID,
		role: "user",
		content: "こんにちは",
		createdAt: "2026-01-01T00:00:00.000Z",
	},
	{
		id: 2,
		conversationId: CONVERSATION_ID,
		role: "assistant",
		content: "こんにちは！",
		createdAt: "2026-01-01T00:00:01.000Z",
	},
];

describe("createOptimisticMessage", () => {
	it("userロールの楽観行を作成する", () => {
		const result = createOptimisticMessage({
			tempId: -1,
			conversationId: CONVERSATION_ID,
			content: "次は何をすべき？",
			baselineCount: 2,
			createdAt: "2026-01-01T00:00:02.000Z",
		});

		expect(result).toEqual({
			id: -1,
			conversationId: CONVERSATION_ID,
			role: "user",
			content: "次は何をすべき？",
			createdAt: "2026-01-01T00:00:02.000Z",
			baselineCount: 2,
		});
	});
});

describe("mergeOptimisticMessage", () => {
	it("楽観行がなければconfirmedMessagesをそのまま返す", () => {
		const result = mergeOptimisticMessage(CONFIRMED_MESSAGES, undefined, CONVERSATION_ID);
		expect(result).toBe(CONFIRMED_MESSAGES);
	});

	it("baseline未達の場合は末尾に楽観行を追加する", () => {
		const optimistic = createOptimisticMessage({
			tempId: -1,
			conversationId: CONVERSATION_ID,
			content: "送信中のメッセージ",
			baselineCount: CONFIRMED_MESSAGES.length,
			createdAt: "2026-01-01T00:00:02.000Z",
		});

		const result = mergeOptimisticMessage(CONFIRMED_MESSAGES, optimistic, CONVERSATION_ID);

		expect(result).toEqual([...CONFIRMED_MESSAGES, optimistic]);
	});

	it("baseline超過（送信成功で+2件済み）の場合は楽観行を含めない", () => {
		const optimistic = createOptimisticMessage({
			tempId: -1,
			conversationId: CONVERSATION_ID,
			content: "送信済みのメッセージ",
			baselineCount: 0,
			createdAt: "2026-01-01T00:00:02.000Z",
		});

		const result = mergeOptimisticMessage(CONFIRMED_MESSAGES, optimistic, CONVERSATION_ID);

		expect(result).toEqual(CONFIRMED_MESSAGES);
	});

	it("楽観行のconversationIdが現在の会話と異なる場合は除外する", () => {
		const optimistic = createOptimisticMessage({
			tempId: -1,
			conversationId: "other-conversation",
			content: "別会話の送信中メッセージ",
			baselineCount: CONFIRMED_MESSAGES.length,
			createdAt: "2026-01-01T00:00:02.000Z",
		});

		const result = mergeOptimisticMessage(CONFIRMED_MESSAGES, optimistic, CONVERSATION_ID);

		expect(result).toEqual(CONFIRMED_MESSAGES);
	});
});
