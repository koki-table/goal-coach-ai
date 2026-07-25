import type { PlanProposal } from "../prompts/coachPrompts";
import type { CoachChatPromptMessage } from "./coachChatPrompt.helper";

// coach_messages.proposal に保存する提案ペイロード。採用済みかどうかと、採用時に
// 作成したエンティティのidを保持し、二重採用の判定と表示に使う。
export type PlanProposalPayload = {
	milestone: { title: string; adopted: boolean; createdMilestoneId?: string } | null;
	todos: { title: string; taskType: "daily" | "once"; adopted: boolean; createdTodoId?: string }[];
};

// メッセージ履歴をプロンプト用の形式に変換する。assistantメッセージのproposalは
// AIが既提案・採用済み項目を認識し重複提案を避けられるよう、採用状態を明示した形で渡す。
export function toPromptMessage(message: {
	role: string;
	content: string;
	proposal: string | null;
}): CoachChatPromptMessage {
	const role = message.role === "user" ? "user" : "assistant";
	if (!message.proposal) {
		return { role, content: message.content };
	}

	const parsed = JSON.parse(message.proposal) as PlanProposalPayload;
	return {
		role,
		content: message.content,
		proposal: {
			milestone: parsed.milestone
				? { title: parsed.milestone.title, adopted: parsed.milestone.adopted }
				: null,
			todos: parsed.todos.map((t) => ({ title: t.title, adopted: t.adopted })),
		},
	};
}

// プロンプトの指示だけに頼らず、既存マイルストーンと完全一致するタイトルが返ってきた場合は
// サーバー側で確実に除外する(会話履歴のウィンドウ外でも重複作成を防ぐ安全策)。
export function toProposalPayload(
	planProposal: PlanProposal,
	existingMilestoneTitles: string[],
): PlanProposalPayload {
	const isDuplicateMilestone =
		planProposal.milestoneTitle !== null &&
		existingMilestoneTitles.some((title) => title.trim() === planProposal.milestoneTitle?.trim());

	return {
		milestone:
			planProposal.milestoneTitle && !isDuplicateMilestone
				? { title: planProposal.milestoneTitle, adopted: false }
				: null,
		todos: planProposal.todos.map((t) => ({
			title: t.title,
			taskType: t.taskType,
			adopted: false,
		})),
	};
}
