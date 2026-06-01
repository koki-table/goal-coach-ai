import { z } from "zod";

// マイルストーンレベルの定義
export const MilestoneLevelEnum = {
	SHORT: "short",
	MEDIUM: "medium",
	LONG: "long",
} as const;

export type MilestoneLevel =
	(typeof MilestoneLevelEnum)[keyof typeof MilestoneLevelEnum];

// マイルストーン入力用スキーマ
export const milestoneInputSchema = z.object({
	title: z
		.string()
		.min(1, "タイトルは必須です")
		.max(100, "タイトルは100文字以内で入力してください"),
	level: z.enum([
		MilestoneLevelEnum.SHORT,
		MilestoneLevelEnum.MEDIUM,
		MilestoneLevelEnum.LONG,
	]),
	order: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export type MilestoneInput = z.infer<typeof milestoneInputSchema>;

// TODO入力用スキーマ
export const todoInputSchema = z.object({
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

export type TodoInput = z.infer<typeof todoInputSchema>;

// マイルストーン一括更新用スキーマ（3つセット）
export const milestonesFormSchema = z.object({
	shortTerm: z.object({
		title: z.string().min(1, "短期目標は必須です").max(100),
		isCompleted: z.boolean(),
	}),
	mediumTerm: z.object({
		title: z.string().min(1, "中期目標は必須です").max(100),
		isCompleted: z.boolean(),
	}),
	longTerm: z.object({
		title: z.string().min(1, "長期目標は必須です").max(100),
		isCompleted: z.boolean(),
	}),
});

export type MilestonesFormInput = z.infer<typeof milestonesFormSchema>;
