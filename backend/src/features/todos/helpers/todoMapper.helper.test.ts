import { describe, expect, it } from "vitest";
import { mapTodoToResponse } from "./todoMapper.helper";

describe("todoMapper helper", () => {
	describe("mapTodoToResponse", () => {
		it("maps DB todo to response with boolean completed", () => {
			const todo = {
				id: "todo-1",
				goalId: "goal-1",
				milestoneId: "ms-1",
				title: "Write tests",
				description: "Unit tests for helpers",
				dueDate: "2026-06-15",
				estimatedMinutes: 60,
				priority: "high",
				taskType: "once" as const,
				isCompleted: 0,
				isAiGenerated: 0,
				createdAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapTodoToResponse(todo, 3);

			expect(result).toEqual({
				id: "todo-1",
				goalId: "goal-1",
				milestoneId: "ms-1",
				title: "Write tests",
				description: "Unit tests for helpers",
				dueDate: "2026-06-15",
				estimatedMinutes: 60,
				priority: "high",
				taskType: "once",
				completed: false,
				completionCount: 3,
				isAiGenerated: false,
				createdAt: "2026-01-01T00:00:00.000Z",
			});
		});

		it("maps isCompleted 1 to completed true", () => {
			const todo = {
				id: "todo-2",
				goalId: "goal-1",
				milestoneId: null,
				title: "Done task",
				description: null,
				dueDate: null,
				estimatedMinutes: null,
				priority: "medium",
				taskType: "daily" as const,
				isCompleted: 1,
				isAiGenerated: 1,
				createdAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapTodoToResponse(todo, 0);

			expect(result.completed).toBe(true);
			expect(result.priority).toBe("medium");
			expect(result.taskType).toBe("daily");
			expect(result.isAiGenerated).toBe(true);
			expect(result.milestoneId).toBeUndefined();
			expect(result.description).toBeUndefined();
			expect(result.dueDate).toBeUndefined();
			expect(result.estimatedMinutes).toBeUndefined();
		});

		it("passes completionCount through", () => {
			const todo = {
				id: "todo-3",
				goalId: "goal-1",
				milestoneId: null,
				title: "Repeat task",
				description: null,
				dueDate: null,
				estimatedMinutes: null,
				priority: "low",
				taskType: "once" as const,
				isCompleted: 0,
				isAiGenerated: 0,
				createdAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapTodoToResponse(todo, 7);
			expect(result.completionCount).toBe(7);
		});
	});
});
