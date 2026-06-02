import { z } from "zod";

// マイルストーン上限
export const MAX_MILESTONES_PER_GOAL = 10;

// マイルストーンエントリスキーマ（フォーム用）
export const milestoneEntrySchema = z.object({
	label: z
		.string()
		.min(1, "ラベルは必須です")
		.max(30, "ラベルは30文字以内で入力してください"),
	title: z
		.string()
		.min(1, "タイトルは必須です")
		.max(100, "タイトルは100文字以内で入力してください"),
	isCompleted: z.boolean(),
});

export type MilestoneEntry = z.infer<typeof milestoneEntrySchema>;

// マイルストーン入力用スキーマ
export const milestoneInputSchema = z.object({
	title: z
		.string()
		.min(1, "タイトルは必須です")
		.max(100, "タイトルは100文字以内で入力してください"),
	label: z
		.string()
		.min(1, "ラベルは必須です")
		.max(30, "ラベルは30文字以内で入力してください"),
	order: z.number().int().min(1).max(10),
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

// マイルストーン一括更新用スキーマ（動的配列）
export const milestonesFormSchema = z.object({
	milestones: z
		.array(milestoneEntrySchema)
		.min(1, "最低1つのマイルストーンが必要です")
		.max(MAX_MILESTONES_PER_GOAL, `マイルストーンは${MAX_MILESTONES_PER_GOAL}個以内です`),
});

export type MilestonesFormInput = z.infer<typeof milestonesFormSchema>;
