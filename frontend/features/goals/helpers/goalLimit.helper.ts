import { MAX_ACTIVE_GOALS } from "../config/goalsConfig";
import type { Goal } from "../types";

// 未完了(status="active")の目標のみを数える。完了・アーカイブ済みは除外する。
export function countActiveGoals(goals: Goal[]): number {
	return goals.filter((goal) => goal.status === "active").length;
}

// 未完了目標が上限未満なら新規作成できる。
export function canCreateGoal(goals: Goal[], max: number = MAX_ACTIVE_GOALS): boolean {
	return countActiveGoals(goals) < max;
}
