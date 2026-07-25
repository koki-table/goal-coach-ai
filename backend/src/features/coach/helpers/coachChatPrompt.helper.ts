import type { GoalSnapshot } from "./goalSnapshot.helper";

export type CoachChatPromptMilestone = {
	title: string;
	isCompleted: boolean;
};

export type CoachChatPromptProposal = {
	milestone: { title: string; adopted: boolean } | null;
	todos: { title: string; adopted: boolean }[];
};

export type CoachChatPromptMessage = {
	role: "user" | "assistant";
	content: string;
	// assistantメッセージに提案が付随していた場合の採用状態。AIが既提案・採用済み項目を
	// 正確に認識し、同一内容の重複提案を避けられるようにするために渡す。
	proposal?: CoachChatPromptProposal;
};

export type CoachChatPromptInput = {
	goalTitle: string;
	goalDeadline?: string | null;
	goalDeleted: boolean;
	snapshot?: GoalSnapshot;
	milestones?: CoachChatPromptMilestone[];
	history: CoachChatPromptMessage[];
};

// XMLタグでデータを明示的に区切り、AIが前提データと会話履歴を正確に認識できるようにする。
export function buildChatUserPrompt(input: CoachChatPromptInput): string {
	const goalDataText = input.goalDeleted
		? `- 目標タイトル(会話開始時点): ${input.goalTitle}
- 達成期限(会話開始時点): ${input.goalDeadline ?? "未設定"}
- 注記: この目標は削除済みです。現況データは取得できないため、会話開始時点のタイトル・期限のみを参考情報として扱ってください。`
		: buildLivingGoalDataText(input);

	const historyText =
		input.history.length > 0
			? input.history
					.map(
						(m) =>
							`  * [${m.role === "user" ? "ユーザー" : "コーチ"}] ${m.content}${buildProposalNote(m.proposal)}`,
					)
					.join("\n")
			: "  (会話履歴なし、これが最初のメッセージです)";

	return `以下のユーザーの目標データと会話履歴を踏まえ、コーチとして応答してください。

<goal_data>
${goalDataText}
</goal_data>

<conversation_history>
${historyText}
</conversation_history>

設定されたキャラクターになりきり、レスポンス形式に従って応答してください。`;
}

// 提案に含まれる各項目(マイルストーン・TODO)の採用状態をAIに明示し、
// 既に提案済み・採用済みの項目を同一内容で繰り返し提案しないようにする。
function buildProposalNote(proposal: CoachChatPromptProposal | undefined): string {
	if (!proposal) return "";

	const parts: string[] = [];
	if (proposal.milestone) {
		parts.push(
			`マイルストーン『${proposal.milestone.title}』(${adoptedLabel(proposal.milestone.adopted)})`,
		);
	}
	for (const todo of proposal.todos) {
		parts.push(`TODO『${todo.title}』(${adoptedLabel(todo.adopted)})`);
	}

	if (parts.length === 0) return "";
	return ` [この発言での提案: ${parts.join(" / ")}]`;
}

function adoptedLabel(adopted: boolean): string {
	return adopted ? "採用済み" : "未採用";
}

function buildLivingGoalDataText(input: CoachChatPromptInput): string {
	const snapshot = input.snapshot;
	const milestones = input.milestones ?? [];
	const milestonesText =
		milestones.length > 0
			? milestones.map((m) => `  * [${m.isCompleted ? "完了" : "未完了"}] ${m.title}`).join("\n")
			: "  (マイルストーンなし)";
	const milestonesNote =
		milestones.length > 0
			? "\n- 注記: 上記のマイルストーンは既に確定済みです。同一タイトルまたは類似内容を新規マイルストーンとして提案しないでください。"
			: "";

	if (!snapshot) {
		return `- 目標タイトル: ${input.goalTitle}
- 達成期限: ${input.goalDeadline ?? "未設定"}
- マイルストーン状態:
${milestonesText}${milestonesNote}`;
	}

	return `- 目標タイトル: ${input.goalTitle}
- 達成期限: ${input.goalDeadline ?? "未設定"}
- 実データに基づく進捗率: ${snapshot.realProgressPercent}%（TODO ${snapshot.completedTodos}/${snapshot.totalTodos}件・マイルストーン ${snapshot.completedMilestones}/${snapshot.totalMilestones}件）
- 期限超過中のTODO数: ${snapshot.overdueTodosCount}件
- 最終活動日時: ${snapshot.lastActivityAt ?? "活動記録なし"}
- 直近7日間の完了数: ${snapshot.completedLast7Days}件 / 作業時間: ${snapshot.minutesSpentLast7Days}分
- マイルストーン状態:
${milestonesText}${milestonesNote}`;
}
