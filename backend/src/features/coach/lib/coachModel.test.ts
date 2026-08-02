import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { streamChat } from "./coachModel";

// MockLanguageModelV4は文字列をそのまま返せないため、objectTextを
// 1つのtext-deltaチャンクとして流すストリームを組み立てる。
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

async function collectReplyDeltas(model: MockLanguageModelV4) {
	const deltas: string[] = [];
	const result = await streamChat(
		{ model, system: "calm mentor persona", prompt: "goal data" },
		(delta) => deltas.push(delta),
	);
	return { result, deltas };
}

describe("coachModel", () => {
	describe("streamChat", () => {
		it("returns a parsed reply without a proposal when the model has not decided to propose yet", async () => {
			const model = mockStreamModelReturning(
				JSON.stringify({
					reply: "現在の状況について、もう少し詳しく教えていただけますか。",
					planProposal: null,
				}),
			);

			const { result } = await collectReplyDeltas(model);

			expect(result).toEqual({
				reply: "現在の状況について、もう少し詳しく教えていただけますか。",
				planProposal: null,
			});
		});

		it("returns a parsed reply with a hierarchical plan proposal", async () => {
			const model = mockStreamModelReturning(
				JSON.stringify({
					reply: "では、次のマイルストーンを提案します。",
					planProposal: {
						milestoneTitle: "基礎文法を習得する",
						milestoneTargetValue: 300,
						milestoneUnit: "問",
						todos: [
							{ title: "毎日30分学習する", taskType: "daily" },
							{ title: "参考書を1冊読み終える", taskType: "once" },
						],
					},
				}),
			);

			const { result } = await collectReplyDeltas(model);

			expect(result.planProposal).toEqual({
				milestoneTitle: "基礎文法を習得する",
				milestoneTargetValue: 300,
				milestoneUnit: "問",
				todos: [
					{ title: "毎日30分学習する", taskType: "daily" },
					{ title: "参考書を1冊読み終える", taskType: "once" },
				],
			});
		});

		it("emits reply text incrementally via onReplyDelta before the object resolves", async () => {
			const model = mockStreamModelReturning(
				JSON.stringify({ reply: "こんにちは、元気ですか。", planProposal: null }),
			);

			const { deltas } = await collectReplyDeltas(model);

			// 部分文字列の増分を連結すると最終的なreplyと一致する
			expect(deltas.join("")).toBe("こんにちは、元気ですか。");
			expect(deltas.length).toBeGreaterThan(0);
		});

		it("throws CoachModelError when the model output does not match the schema", async () => {
			const model = mockStreamModelReturning(JSON.stringify({ unexpected: "shape" }));

			await expect(collectReplyDeltas(model)).rejects.toThrow("Coach chat model failed");
		});
	});
});
