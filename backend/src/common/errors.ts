export class GoalNotFoundError extends Error {
	constructor(id: string) {
		super(`Goal not found: ${id}`);
		this.name = "GoalNotFoundError";
	}
}

export class GoalLimitExceededError extends Error {
	constructor(max: number) {
		super(`Active goal limit exceeded: max ${max}`);
		this.name = "GoalLimitExceededError";
	}
}

export class MilestoneNotFoundError extends Error {
	constructor(id: string) {
		super(`Milestone not found: ${id}`);
		this.name = "MilestoneNotFoundError";
	}
}

export class TodoNotFoundError extends Error {
	constructor(id: string) {
		super(`Todo not found: ${id}`);
		this.name = "TodoNotFoundError";
	}
}

export class CoachNotConfiguredError extends Error {
	constructor() {
		super("Coach chat is not configured: GEMINI_API_KEY is missing");
		this.name = "CoachNotConfiguredError";
	}
}

export class CoachConversationNotFoundError extends Error {
	constructor(id: string) {
		super(`Coach conversation not found: ${id}`);
		this.name = "CoachConversationNotFoundError";
	}
}

export class PlanItemNotFoundError extends Error {
	constructor(messageId: number) {
		super(`Plan item not found for message: ${messageId}`);
		this.name = "PlanItemNotFoundError";
	}
}

export class PlanItemAlreadyAdoptedError extends Error {
	constructor(messageId: number) {
		super(`Plan item already adopted for message: ${messageId}`);
		this.name = "PlanItemAlreadyAdoptedError";
	}
}

export class MilestoneNotAdoptedYetError extends Error {
	constructor(messageId: number) {
		super(`Milestone must be adopted before its todos for message: ${messageId}`);
		this.name = "MilestoneNotAdoptedYetError";
	}
}

export class MilestoneUpdateStaleError extends Error {
	constructor(messageId: number) {
		super(`Milestone current value changed since the proposal was generated: ${messageId}`);
		this.name = "MilestoneUpdateStaleError";
	}
}

export class CoachChatRateLimitError extends Error {
	constructor(userId: string) {
		super(`Coach chat rate limit exceeded for user: ${userId}`);
		this.name = "CoachChatRateLimitError";
	}
}

export class ObjectiveAlreadyAdoptedError extends Error {
	constructor(messageId: number) {
		super(`Objective already adopted for message: ${messageId}`);
		this.name = "ObjectiveAlreadyAdoptedError";
	}
}

export class ExplorationThreadAlreadyLinkedError extends Error {
	constructor(conversationId: string) {
		super(`Exploration thread already linked to a goal: ${conversationId}`);
		this.name = "ExplorationThreadAlreadyLinkedError";
	}
}

export class BillingNotConfiguredError extends Error {
	constructor() {
		super("Billing is not configured: STRIPE_SECRET_KEY is missing");
		this.name = "BillingNotConfiguredError";
	}
}

export class NoStripeCustomerError extends Error {
	constructor(userId: string) {
		super(`No Stripe customer found for user: ${userId}`);
		this.name = "NoStripeCustomerError";
	}
}
