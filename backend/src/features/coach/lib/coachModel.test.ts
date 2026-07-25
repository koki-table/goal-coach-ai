import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { chat } from "./coachModel";

function mockModelReturning(objectText: string) {
	return new MockLanguageModelV4({
		doGenerate: async () => ({
			content: [{ type: "text" as const, text: objectText }],
			finishReason: { unified: "stop" as const, raw: undefined },
			usage: {
				inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
				outputTokens: { total: 10, text: 10, reasoning: undefined },
			},
			warnings: [],
		}),
	});
}

describe("coachModel", () => {
	describe("chat", () => {
		it("returns a parsed reply without a proposal when the model has not decided to propose yet", async () => {
			const model = mockModelReturning(
				JSON.stringify({
					reply: "現在の状況について、もう少し詳しく教えていただけますか。",
					planProposal: null,
				}),
			);

			const result = await chat({ model, system: "calm mentor persona", prompt: "goal data" });

			expect(result).toEqual({
				reply: "現在の状況について、もう少し詳しく教えていただけますか。",
				planProposal: null,
			});
		});

		it("returns a parsed reply with a hierarchical plan proposal", async () => {
			const model = mockModelReturning(
				JSON.stringify({
					reply: "では、次のマイルストーンを提案します。",
					planProposal: {
						milestoneTitle: "基礎文法を習得する",
						todos: [
							{ title: "毎日30分学習する", taskType: "daily" },
							{ title: "参考書を1冊読み終える", taskType: "once" },
						],
					},
				}),
			);

			const result = await chat({ model, system: "calm mentor persona", prompt: "goal data" });

			expect(result.planProposal).toEqual({
				milestoneTitle: "基礎文法を習得する",
				todos: [
					{ title: "毎日30分学習する", taskType: "daily" },
					{ title: "参考書を1冊読み終える", taskType: "once" },
				],
			});
		});

		it("throws CoachModelError when the model output does not match the schema", async () => {
			const model = mockModelReturning(JSON.stringify({ unexpected: "shape" }));

			await expect(
				chat({ model, system: "calm mentor persona", prompt: "goal data" }),
			).rejects.toThrow("Coach chat model failed");
		});
	});
});
