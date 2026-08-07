import type { GoalCategoryType } from "../../types/api";

// カテゴリのenum key(study/career/...)とDB上の日本語名(学習/仕事/...)の相互変換。
// GoalServiceとCoachChatServiceが共有する（coachは他featureのserviceを呼べないため
// この変換ロジックはcommonに置く）。

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
