export type CoachPromptGoal = {
	title: string;
	deadline: string | null;
};

export type CoachPromptMilestone = {
	title: string;
	isCompleted: boolean;
};

export type CoachPromptSnapshot = {
	realProgressPercent: number;
	totalTodos: number;
	completedTodos: number;
	totalMilestones: number;
	completedMilestones: number;
	overdueTodosCount: number;
	lastActivityAt: string | null;
	completedLast7Days: number;
	minutesSpentLast7Days: number;
};

export type CoachPromptEpisode = {
	createdAt: string;
	progressPercent: number;
	memo: string | null;
	obstacles: string | null;
	feedback: string;
};

export type CoachPromptInput = {
	goal: CoachPromptGoal;
	milestones: CoachPromptMilestone[];
	snapshot: CoachPromptSnapshot;
	selfReportedProgressPercent: number;
	memo?: string;
	obstacles?: string;
	recentEpisodes: CoachPromptEpisode[];
};

// XMLタグでデータを明示的に区切り、AIが前提データと命令文を正確に認識できるようにする。
export function buildUserPrompt(input: CoachPromptInput): string {
	const milestonesText =
		input.milestones.length > 0
			? input.milestones
					.map((m) => `  * [${m.isCompleted ? "完了" : "未完了"}] ${m.title}`)
					.join("\n")
			: "  (マイルストーンなし)";

	const episodesText =
		input.recentEpisodes.length > 0
			? input.recentEpisodes
					.map(
						(e) =>
							`  * ${e.createdAt}: 進捗${e.progressPercent}% / メモ「${e.memo ?? "なし"}」 / 前回フィードバック「${e.feedback}」`,
					)
					.join("\n")
			: "  (過去の評価履歴なし)";

	return `以下のユーザーの目標と進捗データを分析し、評価を出力してください。

<goal_data>
- 目標タイトル: ${input.goal.title}
- 達成期限: ${input.goal.deadline ?? "未設定"}
- 自己申告の進捗率: ${input.selfReportedProgressPercent}%
- 実データに基づく進捗率: ${input.snapshot.realProgressPercent}%（TODO ${input.snapshot.completedTodos}/${input.snapshot.totalTodos}件・マイルストーン ${input.snapshot.completedMilestones}/${input.snapshot.totalMilestones}件）
- 期限超過中のTODO数: ${input.snapshot.overdueTodosCount}件
- 最終活動日時: ${input.snapshot.lastActivityAt ?? "活動記録なし"}
- 直近7日間の完了数: ${input.snapshot.completedLast7Days}件 / 作業時間: ${input.snapshot.minutesSpentLast7Days}分
- マイルストーン状態:
${milestonesText}
- ユーザーのメモ: ${input.memo ?? "なし"}
- ユーザーが挙げた障害事項: ${input.obstacles ?? "なし"}
</goal_data>

<recent_episodes>
${episodesText}
</recent_episodes>

設定されたキャラクターになりきり、レスポンス形式に従って評価結果を出力してください。`;
}
