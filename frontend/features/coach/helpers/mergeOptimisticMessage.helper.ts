import type { CoachMessage, OptimisticCoachMessage } from "../types";

export function createOptimisticMessage(params: {
	tempId: number;
	conversationId: string;
	content: string;
	baselineCount: number;
	createdAt: string;
}): OptimisticCoachMessage {
	return {
		id: params.tempId,
		conversationId: params.conversationId,
		role: "user",
		content: params.content,
		createdAt: params.createdAt,
		baselineCount: params.baselineCount,
	};
}

// 送信成功時、user+assistantの2件がアトミックに追加されるためconfirmedMessagesの件数が
// baselineCountを超える。この件数比較のみで楽観行の重複表示/除去を判定する
// （content一致判定は同一文言の連投で誤爆するため使わない）。
export function mergeOptimisticMessage(
	confirmedMessages: CoachMessage[],
	optimisticMessage: OptimisticCoachMessage | undefined,
	conversationId: string | undefined,
): CoachMessage[] {
	if (!optimisticMessage) return confirmedMessages;
	if (optimisticMessage.conversationId !== conversationId) return confirmedMessages;
	if (confirmedMessages.length > optimisticMessage.baselineCount) return confirmedMessages;
	return [...confirmedMessages, optimisticMessage];
}
