import { z } from "zod";

const goalCategorySchema = z.enum(["study", "career", "health", "skill", "finance", "other"]);

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
});

export const milestoneCreateBatchSchema = z.array(milestoneCreateSchema);

export const milestoneUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	label: z.string().max(100).optional(),
	isCompleted: z.boolean().optional(),
});

export const todoCreateSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	dueDate: z.string().optional(),
	estimatedMinutes: z.number().int().min(1).optional(),
	milestoneId: z.string().optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
	isAiGenerated: z.boolean().optional(),
});

export const todoUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).optional(),
	dueDate: z.string().optional(),
	estimatedMinutes: z.number().int().min(1).optional(),
	milestoneId: z.string().optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
	isAiGenerated: z.boolean().optional(),
});

export const todoReorderSchema = z.array(
	z.object({
		id: z.string().min(1),
		sortOrder: z.number().int().min(0),
	}),
);
