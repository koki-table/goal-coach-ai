import { TODO_PRIORITY_LABELS } from "../config/coachConfig";
import type { ProposalTodoUpdate } from "../types";

// suggestedAction指定時は他のsuggested*と排他(バックエンドのtoDailyReviewProposalEnvelopeで
// 保証済み)。それ以外はdueDate/priority/titleのうち提案されているものだけを差分表示する。
export function getTodoUpdateChangeLines(update: ProposalTodoUpdate): string[] {
	const lines: string[] = [];
	if (update.suggestedDueDate !== undefined) {
		lines.push(`期限: ${update.suggestedDueDate ?? "未設定"}`);
	}
	if (update.suggestedPriority !== undefined) {
		lines.push(
			`優先度: ${TODO_PRIORITY_LABELS[update.suggestedPriority] ?? update.suggestedPriority}`,
		);
	}
	if (update.suggestedTitle !== undefined) {
		lines.push(`新しい内容: ${update.suggestedTitle}`);
	}
	return lines;
}

export function getTodoUpdateActionLabel(update: ProposalTodoUpdate): string {
	if (update.suggestedAction === "delete") return "削除する";
	if (update.suggestedAction === "complete") return "完了にする";
	return "この内容に更新する";
}

export function isTodoUpdateDestructive(update: ProposalTodoUpdate): boolean {
	return update.suggestedAction === "delete";
}
