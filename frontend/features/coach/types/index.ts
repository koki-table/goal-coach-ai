export type TaskType = "daily" | "once";

export type CoachConversation = {
	id: string;
	goalId?: string;
	goalTitleSnapshot: string;
	goalDeadlineSnapshot?: string;
	createdAt: string;
	updatedAt: string;
};

export type PlanProposalMilestone = {
	title: string;
	adopted: boolean;
	createdMilestoneId?: string;
};

export type PlanProposalTodo = {
	title: string;
	taskType: TaskType;
	adopted: boolean;
	createdTodoId?: string;
};

export type PlanProposal = {
	milestone: PlanProposalMilestone | null;
	todos: PlanProposalTodo[];
};

export type CoachMessageRole = "user" | "assistant";

export type CoachMessage = {
	id: number;
	conversationId: string;
	role: CoachMessageRole;
	content: string;
	proposal?: PlanProposal;
	createdAt: string;
};

export type CoachMessagePage = {
	messages: CoachMessage[];
	nextCursor?: number;
};

export type AdoptPlanItemTarget = { target: "milestone" } | { target: "todo"; todoIndex: number };
