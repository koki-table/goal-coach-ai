import { z } from "zod";

export const goalCategorySchema = z.enum([
	"study",
	"career",
	"health",
	"skill",
	"finance",
	"other",
]);

export const goalCreateSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	deadline: z.string().min(1),
	category: goalCategorySchema,
});

export const goalUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).optional(),
	deadline: z.string().optional(),
	category: goalCategorySchema.optional(),
});

export const milestoneCreateSchema = z.object({
	id: z.string().optional(),
	title: z.string().min(1).max(200),
	label: z.string().max(100),
	order: z.number().int().min(0),
	isCompleted: z.boolean().optional(),
	// 定量KRの測定値。startは省略時0、targetは達成水準(>0)、currentは省略時0、unitは単位表示
	startValue: z.number().nonnegative().optional(),
	currentValue: z.number().nonnegative().optional(),
	targetValue: z.number().positive().optional(),
	unit: z.string().max(10).optional(),
});

export const milestoneCreateBatchSchema = z.array(milestoneCreateSchema);

export const milestoneUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	label: z.string().max(100).optional(),
	isCompleted: z.boolean().optional(),
	// 現在値更新(＋更新)・目標/単位の編集で使用。currentValue更新時はisCompletedをサーバで再計算する
	startValue: z.number().nonnegative().optional(),
	currentValue: z.number().nonnegative().optional(),
	targetValue: z.number().positive().optional(),
	unit: z.string().max(10).optional(),
});

export const todoCreateSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	dueDate: z.string().optional(),
	estimatedMinutes: z.number().int().min(1).optional(),
	milestoneId: z.string().optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
	taskType: z.enum(["daily", "once"]).optional(),
	isAiGenerated: z.boolean().optional(),
});

export const todoUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).optional(),
	dueDate: z.string().optional(),
	estimatedMinutes: z.number().int().min(1).optional(),
	milestoneId: z.string().optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
	taskType: z.enum(["daily", "once"]).optional(),
	isAiGenerated: z.boolean().optional(),
});

export const todoReorderSchema = z.array(
	z.object({
		id: z.string().min(1),
		sortOrder: z.number().int().min(0),
	}),
);

export const coachConversationCreateSchema = z.object({
	goalId: z.string().min(1),
});

export const coachMessageCreateSchema = z.object({
	content: z.string().min(1).max(1000),
});

// "milestone"はkeyResultIndex:0を指す旧クライアント互換のエイリアス(既存行のみ対象)。
// 新規コードは"keyResult"を使う
export const coachAdoptPlanItemSchema = z.union([
	z.object({ target: z.literal("milestone") }),
	z.object({
		target: z.literal("keyResult"),
		keyResultIndex: z.number().int().min(0),
	}),
	z.object({ target: z.literal("todo"), todoIndex: z.number().int().min(0) }),
	z.object({
		target: z.literal("milestoneUpdate"),
		milestoneUpdateIndex: z.number().int().min(0),
	}),
]);

export const billingCheckoutSchema = z.object({
	interval: z.enum(["monthly", "yearly"]),
});
