// OKRの考え方に基づく目標(Objective)数の上限判定。
// 未完了(status="active")の目標のみを数える。完了・アーカイブ済みは除外する。

export function countActiveGoals(goals: { status: string }[]): number {
	return goals.filter((goal) => goal.status === "active").length;
}

export function isActiveGoalLimitReached(goals: { status: string }[], max: number): boolean {
	return countActiveGoals(goals) >= max;
}
