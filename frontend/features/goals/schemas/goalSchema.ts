import { z } from "zod";

// 目標カテゴリの定義
export const GoalCategory = {
	STUDY: "study",
	CAREER: "career",
	HEALTH: "health",
	SKILL: "skill",
	FINANCE: "finance",
	OTHER: "other",
} as const;

export type GoalCategoryType = (typeof GoalCategory)[keyof typeof GoalCategory];

// 目標入力用スキーマ
export const goalInputSchema = z.object({
	title: z
		.string()
		.min(1, "タイトルは必須です")
		.max(100, "タイトルは100文字以内で入力してください"),
	description: z.string().max(500, "説明は500文字以内で入力してください").optional(),
	deadline: z.string().refine((val) => !val || !Number.isNaN(Date.parse(val)), {
		message: "有効な日付を入力してください",
	}),
	category: z.enum([
		GoalCategory.STUDY,
		GoalCategory.CAREER,
		GoalCategory.HEALTH,
		GoalCategory.SKILL,
		GoalCategory.FINANCE,
		GoalCategory.OTHER,
	]),
});

export type GoalInput = z.infer<typeof goalInputSchema>;

// 現状ステータス更新用スキーマ
export const goalStatusInputSchema = z.object({
	progressPercent: z
		.number()
		.min(0, "進捗率は0%以上で入力してください")
		.max(100, "進捗率は100%以下で入力してください"),
	memo: z.string().max(1000, "メモは1000文字以内で入力してください").optional(),
	obstacles: z.string().max(500, "障害事項は500文字以内で入力してください").optional(),
});

export type GoalStatusInput = z.infer<typeof goalStatusInputSchema>;

// タスク入力用スキーマ
export const taskInputSchema = z.object({
	title: z
		.string()
		.min(1, "タスク名は必須です")
		.max(100, "タスク名は100文字以内で入力してください"),
	dueDate: z
		.string()
		.refine((val) => !val || !Number.isNaN(Date.parse(val)), {
			message: "有効な日付を入力してください",
		})
		.optional(),
	estimatedMinutes: z
		.number()
		.min(1, "見積もり時間は1分以上で入力してください")
		.max(480, "見積もり時間は8時間以内で入力してください")
		.optional(),
});

export type TaskInput = z.infer<typeof taskInputSchema>;
