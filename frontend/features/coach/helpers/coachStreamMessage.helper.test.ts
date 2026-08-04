import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { toStreamingDisplayMessage } from "./coachStreamMessage.helper";

describe("coachStreamMessage.helper", () => {
	describe("toStreamingDisplayMessage", () => {
		it("converts a user message so it can be shown optimistically before the server confirms it", () => {
			const message = {
				id: "1",
				role: "user",
				parts: [{ type: "text", text: "hello" }],
			} as UIMessage;

			const result = toStreamingDisplayMessage(message, "conv-1");

			expect(result?.role).toBe("user");
			expect(result?.content).toBe("hello");
		});

		it("returns undefined for a system message", () => {
			const message = {
				id: "1",
				role: "system",
				parts: [{ type: "text", text: "hello" }],
			} as UIMessage;

			expect(toStreamingDisplayMessage(message, "conv-1")).toBeUndefined();
		});

		it("joins text parts into content and leaves proposal undefined when none has arrived yet", () => {
			const message = {
				id: "abc",
				role: "assistant",
				parts: [
					{ type: "text", text: "現状を" },
					{ type: "text", text: "教えてください。" },
				],
			} as UIMessage;

			const result = toStreamingDisplayMessage(message, "conv-1");

			expect(result?.content).toBe("現状を教えてください。");
			expect(result?.proposal).toBeUndefined();
			expect(result?.role).toBe("assistant");
			expect(result?.conversationId).toBe("conv-1");
		});

		it("extracts the proposal from a data-proposal part", () => {
			const proposal = {
				milestone: { title: "基礎文法を習得する", targetValue: 300, unit: "問", adopted: false },
				todos: [],
			};
			const message = {
				id: "abc",
				role: "assistant",
				parts: [
					{ type: "text", text: "提案します。" },
					{ type: "data-proposal", data: proposal },
				],
			} as UIMessage;

			const result = toStreamingDisplayMessage(message, "conv-1");

			expect(result?.proposal).toEqual(proposal);
		});

		it("produces a stable negative id that does not depend on call order", () => {
			const message = {
				id: "same-id",
				role: "assistant",
				parts: [{ type: "text", text: "x" }],
			} as UIMessage;

			const first = toStreamingDisplayMessage(message, "conv-1");
			const second = toStreamingDisplayMessage(message, "conv-1");

			expect(first?.id).toBe(second?.id);
			expect(first?.id).toBeLessThan(0);
		});

		it("produces different ids for different UIMessage ids", () => {
			const messageA = { id: "id-a", role: "assistant", parts: [] } as UIMessage;
			const messageB = { id: "id-b", role: "assistant", parts: [] } as UIMessage;

			const resultA = toStreamingDisplayMessage(messageA, "conv-1");
			const resultB = toStreamingDisplayMessage(messageB, "conv-1");

			expect(resultA?.id).not.toBe(resultB?.id);
		});
	});
});
