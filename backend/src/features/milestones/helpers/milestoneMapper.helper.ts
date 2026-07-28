import type { MilestoneResponse } from "../../../types/api";

export function mapMilestoneToResponse(milestone: {
	id: string;
	goalId: string;
	title: string;
	label: string | null;
	sortOrder: number;
	isCompleted: number;
	startValue: number;
	currentValue: number;
	targetValue: number;
	unit: string;
	createdAt: string;
}): MilestoneResponse {
	return {
		id: milestone.id,
		goalId: milestone.goalId,
		title: milestone.title,
		label: milestone.label ?? "",
		order: milestone.sortOrder,
		isCompleted: milestone.isCompleted === 1,
		startValue: milestone.startValue,
		currentValue: milestone.currentValue,
		targetValue: milestone.targetValue,
		unit: milestone.unit,
		createdAt: milestone.createdAt,
	};
}
