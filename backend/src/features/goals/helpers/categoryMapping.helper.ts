import type { GoalCategoryType } from "../../../types/api";

const categoryKeyToName: Record<GoalCategoryType, string> = {
	study: "学習",
	career: "仕事",
	health: "健康",
	skill: "スキル",
	finance: "財務",
	other: "その他",
};

const categoryNameToKey: Record<string, GoalCategoryType> = {
	学習: "study",
	仕事: "career",
	健康: "health",
	スキル: "skill",
	財務: "finance",
	その他: "other",
};

export function getCategoryNameFromKey(key: GoalCategoryType): string {
	return categoryKeyToName[key] ?? "その他";
}

export function getCategoryKeyFromName(name: string): GoalCategoryType {
	return categoryNameToKey[name] ?? "other";
}

export function mapGoalToResponse(
	goal: {
		id: string;
		title: string;
		description: string | null;
		dueDate: string | null;
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
		createdAt: goal.createdAt,
		updatedAt: goal.updatedAt,
	};
}
