export type GoalResponse = {
	id: string;
	title: string;
	description?: string;
	deadline: string;
	category: GoalCategoryType;
	createdAt: string;
	updatedAt: string;
};

export type GoalCategoryType = "study" | "career" | "health" | "skill" | "finance" | "other";

export type GoalCreateRequest = {
	title: string;
	description?: string;
	deadline: string;
	category: GoalCategoryType;
};

export type GoalUpdateRequest = Partial<GoalCreateRequest>;

export type MilestoneResponse = {
	id: string;
	goalId: string;
	title: string;
	label: string;
	order: number;
	isCompleted: boolean;
	createdAt: string;
};

export type MilestoneCreateRequest = {
	id?: string;
	title: string;
	label: string;
	order: number;
	isCompleted?: boolean;
};

export type MilestoneUpdateRequest = {
	title?: string;
	label?: string;
	isCompleted?: boolean;
};

export type TodoResponse = {
	id: string;
	goalId: string;
	milestoneId?: string;
	title: string;
	description?: string;
	dueDate?: string;
	estimatedMinutes?: number;
	completed: boolean;
	completionCount: number;
	isAiGenerated: boolean;
	createdAt: string;
};

export type TodoCreateRequest = {
	title: string;
	description?: string;
	dueDate?: string;
	estimatedMinutes?: number;
	milestoneId?: string;
	isAiGenerated?: boolean;
};

export type TodoUpdateRequest = {
	title?: string;
	description?: string;
	dueDate?: string;
	estimatedMinutes?: number;
	milestoneId?: string;
	priority?: string;
	isAiGenerated?: boolean;
};

export type GoalWithTodosResponse = {
	goalId: string;
	goalTitle: string;
	milestones: MilestoneResponse[];
	aiGeneratedTodos: TodoResponse[];
	myTodos: TodoResponse[];
};
