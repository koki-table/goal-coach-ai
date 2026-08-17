export type TaskType = "daily" | "once";
export type GoalCategoryType = "study" | "career" | "health" | "skill" | "finance" | "other";
export type ObjectiveStatus = "decided" | "undecided";

export type CoachConversation = {
	id: string;
	goalId?: string;
	objectiveStatus: ObjectiveStatus;
	goalTitleSnapshot: string;
	goalDeadlineSnapshot?: string;
	createdAt: string;
	updatedAt: string;
};

export type ProposalObjective = {
	title: string;
	deadline: string | null;
	category: GoalCategoryType;
} | null;

export type ProposalKeyResult = {
	title: string;
	targetValue: number;
	unit: string;
	adopted: boolean;
	createdMilestoneId?: string;
};

export type ProposalTodo = {
	title: string;
	taskType: TaskType;
	adopted: boolean;
	createdTodoId?: string;
};

export type ProposalMilestoneUpdate = {
	milestoneId: string;
	milestoneTitle: string;
	baselineCurrentValue: number;
	suggestedCurrentValue: number;
	reason: string;
	adopted: boolean;
	appliedCurrentValue?: number;
};

export type ProposalTodoUpdateAction = "complete" | "delete";

export type ProposalTodoUpdate = {
	todoId: string;
	todoTitle: string;
	baselineDueDate?: string | null;
	baselinePriority?: string;
	baselineTitle?: string;
	suggestedDueDate?: string | null;
	suggestedPriority?: string;
	suggestedTitle?: string;
	suggestedAction?: ProposalTodoUpdateAction;
	reason: string;
	adopted: boolean;
	appliedAt?: string;
};

export type PlanProposal = {
	version: 1;
	objective: ProposalObjective;
	keyResults: ProposalKeyResult[];
	todos: ProposalTodo[];
	milestoneUpdates: ProposalMilestoneUpdate[];
	todoUpdates: ProposalTodoUpdate[];
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

export type AdoptPlanItemTarget =
	| { target: "keyResult"; keyResultIndex: number }
	| { target: "todo"; todoIndex: number }
	| { target: "milestoneUpdate"; milestoneUpdateIndex: number }
	| { target: "todoUpdate"; todoUpdateIndex: number };
