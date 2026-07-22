export class GoalNotFoundError extends Error {
	constructor(id: string) {
		super(`Goal not found: ${id}`);
		this.name = "GoalNotFoundError";
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
		super("Coach evaluation is not configured: GEMINI_API_KEY is missing");
		this.name = "CoachNotConfiguredError";
	}
}

export class CoachRateLimitError extends Error {
	constructor(userId: string) {
		super(`Coach evaluation rate limit exceeded for user: ${userId}`);
		this.name = "CoachRateLimitError";
	}
}
