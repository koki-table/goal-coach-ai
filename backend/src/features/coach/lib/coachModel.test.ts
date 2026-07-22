import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { evaluate } from "./coachModel";

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
	describe("evaluate", () => {
		it("returns a parsed evaluation object on success", async () => {
			const model = mockModelReturning(
				JSON.stringify({
					feedback: "進捗が停滞している",
					successRate: 40,
					actionableSuggestions: ["毎日30分作業する"],
				}),
			);

			const result = await evaluate({ model, system: "harsh persona", prompt: "goal data" });

			expect(result).toEqual({
				feedback: "進捗が停滞している",
				successRate: 40,
				actionableSuggestions: ["毎日30分作業する"],
			});
		});

		it("throws CoachModelError when the model output does not match the schema", async () => {
			const model = mockModelReturning(JSON.stringify({ unexpected: "shape" }));

			await expect(
				evaluate({ model, system: "harsh persona", prompt: "goal data" }),
			).rejects.toThrow("Coach model evaluation failed");
		});
	});
});
