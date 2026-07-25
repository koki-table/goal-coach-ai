export type GoalResponse = {
	id: string;
	title: string;
	description?: string;
	deadline: string;
	category: GoalCategoryType;
	status: string;
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

export type TaskTypeValue = "daily" | "once";

export type TodoResponse = {
	id: string;
	goalId: string;
	milestoneId?: string;
	title: string;
	description?: string;
	dueDate?: string;
	estimatedMinutes?: number;
	priority: string;
	taskType: TaskTypeValue;
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
	priority?: string;
	taskType?: TaskTypeValue;
	isAiGenerated?: boolean;
};

export type TodoUpdateRequest = {
	title?: string;
	description?: string;
	dueDate?: string;
	estimatedMinutes?: number;
	milestoneId?: string;
	priority?: string;
	taskType?: TaskTypeValue;
	isAiGenerated?: boolean;
};

export type GoalWithTodosResponse = {
	goalId: string;
	goalTitle: string;
	milestones: MilestoneResponse[];
	aiGeneratedTodos: TodoResponse[];
	myTodos: TodoResponse[];
};

export type CoachConversationResponse = {
	id: string;
	goalId?: string;
	goalTitleSnapshot: string;
	goalDeadlineSnapshot?: string;
	createdAt: string;
	updatedAt: string;
};

export type PlanProposalTodoPayload = {
	title: string;
	taskType: TaskTypeValue;
	adopted: boolean;
	createdTodoId?: string;
};

export type PlanProposalMilestonePayload = {
	title: string;
	adopted: boolean;
	createdMilestoneId?: string;
};

export type PlanProposalPayload = {
	milestone: PlanProposalMilestonePayload | null;
	todos: PlanProposalTodoPayload[];
};

export type CoachMessageRoleValue = "user" | "assistant";

export type CoachMessageResponse = {
	id: number;
	conversationId: string;
	role: CoachMessageRoleValue;
	content: string;
	proposal?: PlanProposalPayload;
	createdAt: string;
};

export type CoachMessagePageResponse = {
	messages: CoachMessageResponse[];
	nextCursor?: number;
};

export type AdoptPlanItemResponse = {
	proposal: PlanProposalPayload;
	milestone?: MilestoneResponse;
	todo?: TodoResponse;
};
