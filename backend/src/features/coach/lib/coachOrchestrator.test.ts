import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { runCoachTurn } from "./coachOrchestrator";

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

async function collectChunks(stream: ReadableStream<unknown>) {
	const chunks: unknown[] = [];
	for await (const chunk of stream as unknown as AsyncIterable<unknown>) {
		chunks.push(chunk);
	}
	return chunks;
}

describe("coachOrchestrator", () => {
	describe("runCoachTurn", () => {
		it("emits text-delta chunks for the reply and no data-proposal chunk when there is no proposal", async () => {
			const model = mockStreamModelReturning(
				JSON.stringify({ reply: "今の状況を教えてください。", planProposal: null }),
			);

			const { uiStream, turnResult } = runCoachTurn({
				model,
				system: "calm mentor persona",
				prompt: "goal data",
				existingMilestoneTitles: [],
			});

			const chunks = await collectChunks(uiStream);
			const textDeltas = chunks.filter(
				(c): c is { type: "text-delta"; delta: string } =>
					(c as { type?: string }).type === "text-delta",
			);
			const proposalChunks = chunks.filter(
				(c) => (c as { type?: string }).type === "data-proposal",
			);

			expect(textDeltas.map((c) => c.delta).join("")).toBe("今の状況を教えてください。");
			expect(proposalChunks).toHaveLength(0);

			const result = await turnResult;
			expect(result.proposal).toBeNull();
			expect(result.reply).toBe("今の状況を教えてください。");
		});

		it("emits exactly one data-proposal chunk when the model proposes a plan", async () => {
			const model = mockStreamModelReturning(
				JSON.stringify({
					reply: "提案します。",
					planProposal: {
						milestoneTitle: "基礎文法を習得する",
						milestoneTargetValue: 300,
						milestoneUnit: "問",
						todos: [{ title: "毎日30分学習する", taskType: "daily" }],
					},
				}),
			);

			const { uiStream, turnResult } = runCoachTurn({
				model,
				system: "calm mentor persona",
				prompt: "goal data",
				existingMilestoneTitles: [],
			});

			const chunks = await collectChunks(uiStream);
			const proposalChunks = chunks.filter(
				(c) => (c as { type?: string }).type === "data-proposal",
			);

			expect(proposalChunks).toHaveLength(1);

			const result = await turnResult;
			expect(result.proposal?.milestone?.title).toBe("基礎文法を習得する");
		});

		it("drops a proposed milestone that duplicates an existing one, before emitting the chunk", async () => {
			const model = mockStreamModelReturning(
				JSON.stringify({
					reply: "提案します。",
					planProposal: {
						milestoneTitle: "基礎文法を習得する",
						milestoneTargetValue: 300,
						milestoneUnit: "問",
						todos: [],
					},
				}),
			);

			const { uiStream, turnResult } = runCoachTurn({
				model,
				system: "calm mentor persona",
				prompt: "goal data",
				existingMilestoneTitles: ["基礎文法を習得する"],
			});

			await collectChunks(uiStream);
			const result = await turnResult;

			expect(result.proposal?.milestone).toBeNull();
		});

		it("rejects turnResult and emits no data-proposal chunk when the model output does not match the schema", async () => {
			const model = mockStreamModelReturning(JSON.stringify({ unexpected: "shape" }));

			const { uiStream, turnResult } = runCoachTurn({
				model,
				system: "calm mentor persona",
				prompt: "goal data",
				existingMilestoneTitles: [],
			});

			const chunks = await collectChunks(uiStream);
			const proposalChunks = chunks.filter(
				(c) => (c as { type?: string }).type === "data-proposal",
			);
			expect(proposalChunks).toHaveLength(0);

			await expect(turnResult).rejects.toThrow("Coach chat model failed");
		});
	});
});
