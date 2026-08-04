import type { UIMessage } from "ai";
import type { CoachMessage, PlanProposal } from "../types";

// バックエンドがdata-proposalとして送るchunkの型。UIMessageのdata partは
// `data-${string}`をtypeに持ち、dataフィールドに実データが入る。
type ProposalDataPart = { type: `data-${string}`; data: PlanProposal };

function isProposalDataPart(part: UIMessage["parts"][number]): part is ProposalDataPart {
	return part.type === "data-proposal";
}

// useChatが積む進行中のUIMessage(送信直後のuserメッセージ、streaming中のassistant応答)を
// 確定履歴と同じCoachMessage形式に変換する。useChatのsendMessage()は呼び出し時点で
// 同期的にuserメッセージを内部stateにpushするため、これをそのまま楽観的表示に使う。
// まだproposalが届いていない間はundefinedのまま。
// idはサーバー確定前の一時値なので、確定履歴側のidと衝突しない接頭辞を付ける。
export function toStreamingDisplayMessage(
	message: UIMessage,
	conversationId: string,
): CoachMessage | undefined {
	if (message.role !== "assistant" && message.role !== "user") return undefined;

	const content = message.parts
		.filter((part) => part.type === "text")
		.map((part) => (part as { type: "text"; text: string }).text)
		.join("");

	const proposalPart = message.parts.find(isProposalDataPart);

	return {
		id: streamingMessageId(message.id),
		conversationId,
		role: message.role,
		content,
		proposal: proposalPart?.data,
		createdAt: new Date().toISOString(),
	};
}

// 確定後のCoachMessage.id(number)と衝突しないよう、streaming中は負数のダミーidを使う。
// 確定履歴の再取得後にこのIDは表示から消える(useChat側をクリアするため)。
function streamingMessageId(uiMessageId: string): number {
	let hash = 0;
	for (let i = 0; i < uiMessageId.length; i++) {
		hash = (hash * 31 + uiMessageId.charCodeAt(i)) | 0;
	}
	return -Math.abs(hash) - 1;
}
