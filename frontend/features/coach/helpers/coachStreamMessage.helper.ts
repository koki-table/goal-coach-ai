import type { UIMessage } from "ai";
import type { CoachMessage, PlanProposal } from "../types";

// バックエンドがdata-proposalとして送るchunkの型。UIMessageのdata partは
// `data-${string}`をtypeに持ち、dataフィールドに実データが入る。
type ProposalDataPart = { type: `data-${string}`; data: PlanProposal };

function isProposalDataPart(part: UIMessage["parts"][number]): part is ProposalDataPart {
	return part.type === "data-proposal";
}

// useChatが積む進行中のUIMessage(streaming中のassistant応答)を、確定履歴と同じ
// CoachMessage形式に変換する。まだproposalが届いていない間はundefinedのまま。
// idはサーバー確定前の一時値なので、確定履歴側のidと衝突しない接頭辞を付ける。
export function toStreamingDisplayMessage(
	message: UIMessage,
	conversationId: string,
): CoachMessage | undefined {
	if (message.role !== "assistant") return undefined;

	const content = message.parts
		.filter((part) => part.type === "text")
		.map((part) => (part as { type: "text"; text: string }).text)
		.join("");

	const proposalPart = message.parts.find(isProposalDataPart);

	return {
		id: streamingMessageId(message.id),
		conversationId,
		role: "assistant",
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
