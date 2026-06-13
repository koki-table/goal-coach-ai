import { calculateProgress } from "./calculateProgress.helper";

export type GoalProgressInput = {
	totalTodos: number;
	completedTodos: number;
	totalMilestones: number;
	completedMilestones: number;
};

const TODO_WEIGHT = 0.7;
const MILESTONE_WEIGHT = 0.3;

/**
 * TODO完了率（70%重み）+ マイルストーン完了率（30%重み）で目標進捗を算出
 * @returns 0〜100 の整数
 */
export function calculateGoalProgress(input: GoalProgressInput): number {
	const todoProgress = calculateProgress(input.completedTodos, input.totalTodos);
	const milestoneProgress = calculateProgress(input.completedMilestones, input.totalMilestones);

	// 両方ゼロの場合は 0
	if (input.totalTodos === 0 && input.totalMilestones === 0) return 0;

	// TODO のみの場合
	if (input.totalMilestones === 0) return todoProgress;

	// マイルストーンのみの場合
	if (input.totalTodos === 0) return milestoneProgress;

	return Math.round(todoProgress * TODO_WEIGHT + milestoneProgress * MILESTONE_WEIGHT);
}
