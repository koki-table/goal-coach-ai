import { describe, expect, it } from "vitest";
import { mapConversationToResponse, mapMessageToResponse } from "./coachChatMapper.helper";

describe("mapConversationToResponse", () => {
	it("maps a living conversation with goalId present", () => {
		const result = mapConversationToResponse({
			id: "conv-1",
			goalId: "goal-1",
			kind: "goal",
			goalTitleSnapshot: "TOEIC800点を取る",
			goalDeadlineSnapshot: "2026-12-31",
			createdAt: "2026-07-01T00:00:00.000Z",
			updatedAt: "2026-07-02T00:00:00.000Z",
		});

		expect(result).toEqual({
			id: "conv-1",
			goalId: "goal-1",
			kind: "goal",
			goalTitleSnapshot: "TOEIC800点を取る",
			goalDeadlineSnapshot: "2026-12-31",
			createdAt: "2026-07-01T00:00:00.000Z",
			updatedAt: "2026-07-02T00:00:00.000Z",
		});
	});

	it("omits goalId and goalDeadlineSnapshot when the goal has been deleted", () => {
		const result = mapConversationToResponse({
			id: "conv-1",
			goalId: null,
			kind: "goal",
			goalTitleSnapshot: "TOEIC800点を取る",
			goalDeadlineSnapshot: null,
			createdAt: "2026-07-01T00:00:00.000Z",
			updatedAt: "2026-07-02T00:00:00.000Z",
		});

		expect(result.goalId).toBeUndefined();
		expect(result.goalDeadlineSnapshot).toBeUndefined();
	});

	it("maps an exploration conversation with kind=exploration", () => {
		const result = mapConversationToResponse({
			id: "conv-1",
			goalId: null,
			kind: "exploration",
			goalTitleSnapshot: "目標を決める相談",
			goalDeadlineSnapshot: null,
			createdAt: "2026-07-01T00:00:00.000Z",
			updatedAt: "2026-07-02T00:00:00.000Z",
		});

		expect(result.kind).toBe("exploration");
	});
});

describe("mapMessageToResponse", () => {
	it("normalizes a legacy proposal JSON into the version:1 envelope", () => {
		const result = mapMessageToResponse({
			id: 1,
			conversationId: "conv-1",
			role: "assistant",
			content: "次のマイルストーンを提案します。",
			proposal: JSON.stringify({
				milestone: { title: "基礎文法を習得する", targetValue: 100, unit: "%", adopted: false },
				todos: [{ title: "毎日30分学習する", taskType: "daily", adopted: false }],
			}),
			createdAt: "2026-07-01T00:00:00.000Z",
		});

		expect(result.proposal).toEqual({
			version: 1,
			objective: null,
			keyResults: [{ title: "基礎文法を習得する", targetValue: 100, unit: "%", adopted: false }],
			todos: [{ title: "毎日30分学習する", taskType: "daily", adopted: false }],
		});
	});

	it("leaves proposal undefined when the message has no proposal", () => {
		const result = mapMessageToResponse({
			id: 1,
			conversationId: "conv-1",
			role: "user",
			content: "最近全然進んでいません",
			proposal: null,
			createdAt: "2026-07-01T00:00:00.000Z",
		});

		expect(result.proposal).toBeUndefined();
	});
});
