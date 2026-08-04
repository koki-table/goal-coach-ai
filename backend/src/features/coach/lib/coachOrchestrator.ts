import { createUIMessageStream } from "ai";
import type { UIMessageChunk } from "ai";
import type { PlanProposalPayload } from "../helpers/coachProposal.helper";
import { toProposalPayload } from "../helpers/coachProposal.helper";
import type { CoachChatReplyResult } from "../prompts/coachPrompts";
import type { CoachModelError } from "./coachModel";
import { streamChat } from "./coachModel";
import type { createCoachModel } from "./coachModel";

// LangGraph等への将来の差し替えを想定し、この型の外にLLM呼び出しの都合
// (ストリームの形・スキーマ・SDK固有の型)を漏らさない。CoachChatServiceは
// このモジュールの結果を永続化するだけにする。
export type CoachTurnInput = {
	model: ReturnType<typeof createCoachModel>;
	system: string;
	prompt: string;
	existingMilestoneTitles: string[];
};

export type CoachTurnResult = {
	// SSEとしてそのままHTTPレスポンス化できるUI Message Chunkのストリーム。
	uiStream: ReadableStream<UIMessageChunk>;
	// ストリーム完了後に確定するreplyとproposal。呼び出し側はuiStreamを最後まで
	// 消費した後にこのpromiseを読む（streamChatの制約を引き継ぐ）。
	turnResult: Promise<{ reply: string; proposal: PlanProposalPayload | null }>;
};

const REPLY_TEXT_PART_ID = "reply";

// 1ターン分の応答を作る。reply部分文字列をtext-deltaとして逐次書き出し、
// ストリーム終端で確定したproposalをdata-proposalとして書き出す。
export function runCoachTurn(input: CoachTurnInput): CoachTurnResult {
	let resolveTurnResult: (value: { reply: string; proposal: PlanProposalPayload | null }) => void;
	let rejectTurnResult: (error: unknown) => void;
	const turnResult = new Promise<{ reply: string; proposal: PlanProposalPayload | null }>(
		(resolve, reject) => {
			resolveTurnResult = resolve;
			rejectTurnResult = reject;
		},
	);

	const uiStream = createUIMessageStream({
		execute: async ({ writer }) => {
			writer.write({ type: "text-start", id: REPLY_TEXT_PART_ID });

			try {
				const result: CoachChatReplyResult = await streamChat(
					{ model: input.model, system: input.system, prompt: input.prompt },
					(delta) => {
						writer.write({ type: "text-delta", id: REPLY_TEXT_PART_ID, delta });
					},
				);

				writer.write({ type: "text-end", id: REPLY_TEXT_PART_ID });

				const proposal: PlanProposalPayload | null = result.planProposal
					? toProposalPayload(result.planProposal, input.existingMilestoneTitles)
					: null;

				if (proposal) {
					writer.write({ type: "data-proposal", data: proposal });
				}

				resolveTurnResult({ reply: result.reply, proposal });
			} catch (error) {
				writer.write({ type: "text-end", id: REPLY_TEXT_PART_ID });
				rejectTurnResult(error as CoachModelError);
				throw error;
			}
		},
	});

	return { uiStream, turnResult };
}
