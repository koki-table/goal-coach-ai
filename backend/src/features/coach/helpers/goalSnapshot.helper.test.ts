import { describe, expect, it } from "vitest";
import { buildGoalSnapshot } from "./goalSnapshot.helper";

const NOW = new Date("2026-07-22T12:00:00.000Z");

describe("goalSnapshot helper", () => {
	describe("buildGoalSnapshot", () => {
		it("returns 0 progress with no todos and no milestones", () => {
			const result = buildGoalSnapshot([], [], [], NOW);

			expect(result.realProgressPercent).toBe(0);
			expect(result.totalTodos).toBe(0);
			expect(result.totalMilestones).toBe(0);
			expect(result.lastActivityAt).toBeNull();
		});

		it("weights todo progress 70% and milestone progress 30% when both exist", () => {
			const todos = [
				{ isCompleted: 1, completedAt: "2026-07-20T00:00:00.000Z", dueDate: null },
				{ isCompleted: 0, completedAt: null, dueDate: null },
			];
			const milestones = [{ isCompleted: 1 }, { isCompleted: 0 }];

			const result = buildGoalSnapshot(todos, milestones, [], NOW);

			// todoProgress=50, milestoneProgress=50 -> 50*0.7+50*0.3=50
			expect(result.realProgressPercent).toBe(50);
		});

		it("uses todo progress only when there are no milestones", () => {
			const todos = [
				{ isCompleted: 1, completedAt: null, dueDate: null },
				{ isCompleted: 1, completedAt: null, dueDate: null },
				{ isCompleted: 0, completedAt: null, dueDate: null },
			];

			const result = buildGoalSnapshot(todos, [], [], NOW);

			expect(result.realProgressPercent).toBe(67);
		});

		it("counts overdue incomplete todos only", () => {
			const todos = [
				{ isCompleted: 0, completedAt: null, dueDate: "2026-07-01T00:00:00.000Z" },
				{ isCompleted: 1, completedAt: null, dueDate: "2026-07-01T00:00:00.000Z" },
				{ isCompleted: 0, completedAt: null, dueDate: "2026-08-01T00:00:00.000Z" },
			];

			const result = buildGoalSnapshot(todos, [], [], NOW);

			expect(result.overdueTodosCount).toBe(1);
		});

		it("derives lastActivityAt from the most recent log or todo completion", () => {
			const todos = [{ isCompleted: 1, completedAt: "2026-07-21T00:00:00.000Z", dueDate: null }];
			const todoLogs = [
				{ type: "completed", durationMinutes: 30, createdAt: "2026-07-19T00:00:00.000Z" },
				{ type: "started", durationMinutes: null, createdAt: "2026-07-22T09:00:00.000Z" },
			];

			const result = buildGoalSnapshot(todos, [], todoLogs, NOW);

			expect(result.lastActivityAt).toBe("2026-07-22T09:00:00.000Z");
		});

		it("aggregates completions and minutes within the last 7 days only", () => {
			const todoLogs = [
				{ type: "completed", durationMinutes: 20, createdAt: "2026-07-21T00:00:00.000Z" },
				{ type: "completed", durationMinutes: 10, createdAt: "2026-07-01T00:00:00.000Z" },
				{ type: "started", durationMinutes: 5, createdAt: "2026-07-21T00:00:00.000Z" },
			];

			const result = buildGoalSnapshot([], [], todoLogs, NOW);

			expect(result.completedLast7Days).toBe(1);
			expect(result.minutesSpentLast7Days).toBe(25);
		});
	});
});
