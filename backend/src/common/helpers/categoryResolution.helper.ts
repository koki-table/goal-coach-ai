import type { GoalCategoryType } from "../../types/api";
import type { GoalCategoryRepository } from "../repositories/goalCategoryRepository";
import { getCategoryNameFromKey } from "./categoryMapping.helper";

// カテゴリ名からgoalCategories.idを解決する。ユーザーにカテゴリが1件も無い場合は
// 既定カテゴリ群を作成してから引く（GoalServiceとCoachChatServiceが共有するルール）。
export async function resolveCategoryId(
	categoryRepo: GoalCategoryRepository,
	userId: string,
	categoryKey: GoalCategoryType,
): Promise<string> {
	const categoryName = getCategoryNameFromKey(categoryKey);

	let category = await categoryRepo.findByUserIdAndName(userId, categoryName);
	if (!category) {
		const created = await categoryRepo.createDefaultCategories(userId);
		category = created.find((c) => c.name === categoryName) ?? created[0];
	}

	return category.id;
}
