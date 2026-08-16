import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, streamObject } from "ai";
import type { z } from "zod";
import type { Bindings } from "../../../types/env";
import { coachChatReplySchema } from "../prompts/coachPrompts";
import type { CoachChatReplyResult } from "../prompts/coachPrompts";

// AI_GATEWAY_ACCOUNT_ID/NAMEが両方揃えばCloudflare AI Gateway経由、無ければ既定のgoogleapisへ直叩き。
function buildBaseURL(env: Bindings): string | undefined {
	if (!env.AI_GATEWAY_ACCOUNT_ID || !env.AI_GATEWAY_NAME) return undefined;
	return `https://gateway.ai.cloudflare.com/v1/${env.AI_GATEWAY_ACCOUNT_ID}/${env.AI_GATEWAY_NAME}/google-ai-studio/v1beta`;
}

export class CoachModelError extends Error {
	constructor(cause: unknown) {
		super(`Coach chat model failed: ${cause instanceof Error ? cause.message : String(cause)}`);
		this.name = "CoachModelError";
	}
}

// modelIdはCoachChatGateがtier/使用量から決定する(coachModelConfig.tsのCOACH_MODEL_FREE/PRO)
export function createCoachModel(env: Bindings, modelId: string) {
	const google = createGoogleGenerativeAI({
		apiKey: env.GEMINI_API_KEY,
		baseURL: buildBaseURL(env),
	});
	return google(modelId);
}

// generateObjectの1発生成ではreply全体が確定するまでユーザーが無言待ちになるため、
// streamObjectでreplyフィールドの部分文字列を先行して取り出せる形にしている。
// tool callベースの構成(生成させてから関数呼び出しで提案を受け取る形)はGeminiで
// 「テキストのみ返してtool callを実行しない」「toolChoice:requiredでは同一提案を
// 複数回重複生成する」という不整合が実測で確認されたため採用していない。
//
// streamObjectの`object`promiseは`partialObjectStream`を最後まで消費しないと
// 解決しない（内部で同じbaseStreamを共有しているため）。呼び出し側が両者を
// 別々に受け取ると消費順序を誤ってハングし得るので、コールバック形式にして
// 「必ずstreamを読み切ってからresultを返す」流れをこの関数内に閉じ込める。
export async function streamChat(
	params: {
		model: ReturnType<typeof createCoachModel>;
		system: string;
		prompt: string;
	},
	onReplyDelta: (delta: string) => void,
): Promise<CoachChatReplyResult> {
	const stream = streamObject({
		model: params.model,
		system: params.system,
		prompt: params.prompt,
		schema: coachChatReplySchema,
		temperature: 0.7,
	});

	try {
		let prevLength = 0;
		for await (const partial of stream.partialObjectStream) {
			const reply = partial.reply ?? "";
			if (reply.length > prevLength) {
				onReplyDelta(reply.slice(prevLength));
				prevLength = reply.length;
			}
		}
		return await stream.object;
	} catch (error) {
		throw new CoachModelError(error);
	}
}

// 日次レビュー等、ストリーミングUIを持たないバッチ処理向けの1発生成。streamChat()と同じ
// モデルを使うが、部分文字列のコールバックを持たず結果を一括で返す(SSE用の
// createUIMessageStream/coachOrchestratorを経由する必要がないバッチ呼び出し専用)。
export async function generateStructured<T>(params: {
	model: ReturnType<typeof createCoachModel>;
	system: string;
	prompt: string;
	schema: z.ZodType<T>;
}): Promise<T> {
	try {
		const result = await generateObject({
			model: params.model,
			system: params.system,
			prompt: params.prompt,
			schema: params.schema,
			temperature: 0.7,
		});
		return result.object;
	} catch (error) {
		throw new CoachModelError(error);
	}
}
