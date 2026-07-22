import { z } from "zod";

// マイルストーン上限
export const MAX_MILESTONES_PER_GOAL = 10;

// マイルストーンエントリスキーマ（フォーム用）
// idあり=既存マイルストーン（バックエンドで更新）、idなし=新規（作成）
export const milestoneEntrySchema = z.object({
	id: z.string().optional(),
	label: z.string().min(1, "ラベルは必須です").max(30, "ラベルは30文字以内で入力してください"),
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
	label: z.string().min(1, "ラベルは必須です").max(30, "ラベルは30文字以内で入力してください"),
	order: z.number().int().min(1).max(10),
});

export type MilestoneInput = z.infer<typeof milestoneInputSchema>;

// 優先度スキーマ
export const todoPrioritySchema = z.enum(["low", "medium", "high"]);

// タスク種別スキーマ
export const todoTaskTypeSchema = z.enum(["daily", "once"]);

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
	priority: todoPrioritySchema.optional(),
	taskType: todoTaskTypeSchema.optional(),
	description: z.string().max(500, "説明は500文字以内で入力してください").optional(),
	milestoneId: z.string().optional(),
});

export type TodoInput = z.infer<typeof todoInputSchema>;

// TODO更新用スキーマ（PATCHリクエスト用、全フィールドoptional/nullable）
export const todoUpdateSchema = z.object({
	title: z
		.string()
		.min(1, "タスク名は必須です")
		.max(100, "タスク名は100文字以内で入力してください")
		.optional(),
	dueDate: z
		.string()
		.refine((val) => !val || !Number.isNaN(Date.parse(val)), {
			message: "有効な日付を入力してください",
		})
		.nullable()
		.optional(),
	estimatedMinutes: z
		.number()
		.min(1, "見積もり時間は1分以上で入力してください")
		.max(480, "見積もり時間は8時間以内で入力してください")
		.nullable()
		.optional(),
	priority: todoPrioritySchema.nullable().optional(),
	taskType: todoTaskTypeSchema.optional(),
	description: z.string().max(500, "説明は500文字以内で入力してください").nullable().optional(),
	milestoneId: z.string().nullable().optional(),
});

export type TodoUpdateInput = z.infer<typeof todoUpdateSchema>;

// マイルストーン一括更新用スキーマ（動的配列）
export const milestonesFormSchema = z.object({
	milestones: z
		.array(milestoneEntrySchema)
		.min(1, "最低1つのマイルストーンが必要です")
		.max(MAX_MILESTONES_PER_GOAL, `マイルストーンは${MAX_MILESTONES_PER_GOAL}個以内です`),
});

export type MilestonesFormInput = z.infer<typeof milestonesFormSchema>;
