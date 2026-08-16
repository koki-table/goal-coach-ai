import type { TaskType } from "../../../db/schema/constants";
import type { GoalSnapshot } from "./goalSnapshot.helper";

export type DailyReviewPromptMilestone = {
	id: string;
	title: string;
	startValue: number;
	currentValue: number;
	targetValue: number;
	unit: string;
};

export type DailyReviewPromptTodo = {
	id: string;
	title: string;
	taskType: TaskType;
	priority: string;
	dueDate: string | null;
	isCompleted: boolean;
};

export type DailyReviewPromptInput = {
	goalTitle: string;
	goalDeadline: string | null;
	today: string;
	snapshot: GoalSnapshot;
	// 未完了のKRのみを渡す(完了済みは推定対象外。呼び出し側でフィルタする)
	milestones: DailyReviewPromptMilestone[];
	// AIが不足を補う新規TODOを提案する時に既存TODOのtaskType(daily/once)と矛盾しない
	// 判定をできるように、また既存TODOの更新提案(todoUpdates)でidを参照し
	// 期限超過・停滞・優先度を判断できるように渡す
	existingTodos: DailyReviewPromptTodo[];
};

// 日次レビュー専用のプロンプト文字列を組み立てる。通常チャット(buildChatUserPrompt)と
// 同じXMLタグ区切りの方針を踏襲しつつ、対話履歴を持たない一方向の報告のため
// conversation_historyは含めない。milestoneUpdates/todoUpdatesの応答でmilestoneId/todoIdを
// そのまま参照できるよう、各KR・TODOのidをプロンプトに明示する(サーバー側の
// toDailyReviewProposalEnvelopeが実在チェックの安全網を持つため、AIが誤ったidを
// 返しても提案から除外される)。
export function buildDailyReviewPrompt(input: DailyReviewPromptInput): string {
	const milestonesText =
		input.milestones.length > 0
			? input.milestones
					.map(
						(m) =>
							`  * milestoneId: ${m.id} / タイトル: ${m.title} / 現在値: ${m.currentValue}${m.unit} / 開始値: ${m.startValue}${m.unit} / 目標値: ${m.targetValue}${m.unit}`,
					)
					.join("\n")
			: "  (未完了の主要な成果なし)";

	const existingTodosText =
		input.existingTodos.length > 0
			? input.existingTodos
					.map(
						(t) =>
							`  * todoId: ${t.id} / [${t.taskType === "daily" ? "毎日" : "一回のみ"}/${t.isCompleted ? "完了" : "未完了"}/優先度${t.priority}] ${t.title} / 期限: ${t.dueDate ?? "未設定"}`,
					)
					.join("\n")
			: "  (既存TODOなし)";

	return `以下のユーザーの目標データを踏まえ、コーチとして日次レビューを行ってください。

<goal_data>
- 本日の日付: ${input.today}
- 目標タイトル: ${input.goalTitle}
- 達成期限: ${input.goalDeadline ?? "未設定"}
- 実データに基づく進捗率: ${input.snapshot.realProgressPercent}%（TODO ${input.snapshot.completedTodos}/${input.snapshot.totalTodos}件・主要な成果 ${input.snapshot.completedMilestones}/${input.snapshot.totalMilestones}件）
- 期限超過中のTODO数: ${input.snapshot.overdueTodosCount}件
- 最終活動日時: ${input.snapshot.lastActivityAt ?? "活動記録なし"}
- 直近7日間の完了数: ${input.snapshot.completedLast7Days}件 / 作業時間: ${input.snapshot.minutesSpentLast7Days}分
- 未完了の主要な成果(Key Results)の測定値(milestoneUpdatesで参照する時は必ずここのmilestoneIdをそのまま使うこと):
${milestonesText}
</goal_data>

<existing_todos>
${existingTodosText}
</existing_todos>

設定されたキャラクターになりきり、レスポンス形式に従って応答してください。`;
}
