import type { GoalSnapshot } from "./goalSnapshot.helper";

export type CoachChatPromptMilestone = {
	title: string;
	isCompleted: boolean;
};

export type CoachChatPromptProposal = {
	objective: { title: string; adopted: boolean } | null;
	keyResults: { title: string; adopted: boolean }[];
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
	// 本日の日付(ISO, YYYY-MM-DD)。LLMが期限(deadline)を推測で生成し過去日付等の
	// 不自然な値を返すことを防ぐため、常に明示的に渡す
	today: string;
	// active goal数。上限到達時にAIが対話で先に伝えられるようにする
	activeGoalCount?: number;
	// #52(Step3)で全人的プロフィールを注入するための拡張点。現時点では未使用
	wholePersonProfile?: unknown;
	// コーチングフェーズの拡張点。現時点では未使用
	phase?: unknown;
};

// XMLタグでデータを明示的に区切り、AIが前提データと会話履歴を正確に認識できるようにする。
export function buildChatUserPrompt(input: CoachChatPromptInput): string {
	const goalDataText = input.goalDeleted
		? `- 本日の日付: ${input.today}
- 目標タイトル(会話開始時点): ${input.goalTitle}
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

	const userStateText =
		input.activeGoalCount !== undefined
			? `\n\n<user_state>\n- 現在のactive(未完了)目標数: ${input.activeGoalCount}件\n</user_state>`
			: "";

	return `以下のユーザーの目標データと会話履歴を踏まえ、コーチとして応答してください。

<goal_data>
${goalDataText}
</goal_data>

<conversation_history>
${historyText}
</conversation_history>${userStateText}

設定されたキャラクターになりきり、レスポンス形式に従って応答してください。`;
}

// 提案に含まれる各項目(Objective・KR・TODO)の採用状態をAIに明示し、
// 既に提案済み・採用済みの項目を同一内容で繰り返し提案しないようにする。
function buildProposalNote(proposal: CoachChatPromptProposal | undefined): string {
	if (!proposal) return "";

	const parts: string[] = [];
	if (proposal.objective) {
		parts.push(
			`目標(Objective)『${proposal.objective.title}』(${adoptedLabel(proposal.objective.adopted)})`,
		);
	}
	for (const keyResult of proposal.keyResults) {
		parts.push(`主要な成果(Key Result)『${keyResult.title}』(${adoptedLabel(keyResult.adopted)})`);
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
			: "  (主要な成果なし)";
	const milestonesNote =
		milestones.length > 0
			? "\n- 注記: 上記の主要な成果(Key Results)は既に確定済みです。同一タイトルまたは類似内容を新規の主要な成果として提案しないでください。"
			: "";

	if (!snapshot) {
		return `- 本日の日付: ${input.today}
- 目標タイトル: ${input.goalTitle}
- 達成期限: ${input.goalDeadline ?? "未設定"}
- 主要な成果(Key Results)の状態:
${milestonesText}${milestonesNote}`;
	}

	return `- 本日の日付: ${input.today}
- 目標タイトル: ${input.goalTitle}
- 達成期限: ${input.goalDeadline ?? "未設定"}
- 実データに基づく進捗率: ${snapshot.realProgressPercent}%（TODO ${snapshot.completedTodos}/${snapshot.totalTodos}件・主要な成果 ${snapshot.completedMilestones}/${snapshot.totalMilestones}件）
- 期限超過中のTODO数: ${snapshot.overdueTodosCount}件
- 最終活動日時: ${snapshot.lastActivityAt ?? "活動記録なし"}
- 直近7日間の完了数: ${snapshot.completedLast7Days}件 / 作業時間: ${snapshot.minutesSpentLast7Days}分
- 主要な成果(Key Results)の状態:
${milestonesText}${milestonesNote}`;
}
