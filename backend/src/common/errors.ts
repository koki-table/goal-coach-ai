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
