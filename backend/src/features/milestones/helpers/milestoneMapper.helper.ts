import type { MilestoneResponse } from "../../../types/api";

export function mapMilestoneToResponse(milestone: {
	id: string;
	goalId: string;
	title: string;
	label: string | null;
	sortOrder: number;
	isCompleted: number;
	createdAt: string;
}): MilestoneResponse {
	return {
		id: milestone.id,
		goalId: milestone.goalId,
		title: milestone.title,
		label: milestone.label ?? "",
		order: milestone.sortOrder,
		isCompleted: milestone.isCompleted === 1,
		createdAt: milestone.createdAt,
	};
}
