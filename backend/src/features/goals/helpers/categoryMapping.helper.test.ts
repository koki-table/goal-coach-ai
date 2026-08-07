import { describe, expect, it } from "vitest";
import { mapGoalToResponse } from "./categoryMapping.helper";

describe("categoryMapping helper", () => {
	describe("mapGoalToResponse", () => {
		it("maps goal with category to response", () => {
			const goal = {
				id: "goal-1",
				title: "Learn TypeScript",
				description: "Study advanced TS",
				dueDate: "2026-12-01",
				status: "active",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapGoalToResponse(goal, "学習");

			expect(result).toEqual({
				id: "goal-1",
				title: "Learn TypeScript",
				description: "Study advanced TS",
				deadline: "2026-12-01",
				category: "study",
				status: "active",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			});
		});

		it("maps goal with null description to undefined", () => {
			const goal = {
				id: "goal-1",
				title: "Test",
				description: null,
				dueDate: "2026-12-01",
				status: "active",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapGoalToResponse(goal, "学習");
			expect(result.description).toBeUndefined();
		});

		it("maps goal with null category to other", () => {
			const goal = {
				id: "goal-1",
				title: "Test",
				description: null,
				dueDate: null,
				status: "active",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapGoalToResponse(goal, null);
			expect(result.category).toBe("other");
			expect(result.deadline).toBe("");
		});
	});
});
