import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { Bindings } from "../../../types/env";
import { coachChatReplySchema } from "../prompts/coachPrompts";
import type { CoachChatReplyResult } from "../prompts/coachPrompts";

const MODEL_ID = "gemini-2.5-flash-lite";

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

export function createCoachModel(env: Bindings) {
	const google = createGoogleGenerativeAI({
		apiKey: env.GEMINI_API_KEY,
		baseURL: buildBaseURL(env),
	});
	return google(MODEL_ID);
}

export async function chat(params: {
	model: ReturnType<typeof createCoachModel>;
	system: string;
	prompt: string;
}): Promise<CoachChatReplyResult> {
	try {
		const { object } = await generateObject({
			model: params.model,
			system: params.system,
			prompt: params.prompt,
			schema: coachChatReplySchema,
			temperature: 0.7,
		});
		return object;
	} catch (error) {
		throw new CoachModelError(error);
	}
}
