import {
	getCategoryKeyFromName,
	getCategoryNameFromKey,
} from "../../../common/helpers/categoryMapping.helper";
import type { GoalCategoryType } from "../../../types/api";

export { getCategoryKeyFromName, getCategoryNameFromKey };

export function mapGoalToResponse(
	goal: {
		id: string;
		title: string;
		description: string | null;
		dueDate: string | null;
		status: string;
		createdAt: string;
		updatedAt: string;
	},
	categoryName: string | null,
) {
	return {
		id: goal.id,
		title: goal.title,
		description: goal.description ?? undefined,
		deadline: goal.dueDate ?? "",
		category: categoryName ? getCategoryKeyFromName(categoryName) : ("other" as GoalCategoryType),
		status: goal.status,
		createdAt: goal.createdAt,
		updatedAt: goal.updatedAt,
	};
}
