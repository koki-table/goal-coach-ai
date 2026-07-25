import { describe, expect, it } from "vitest";
import type { Goal } from "../types";
import { canCreateGoal, countActiveGoals } from "./goalLimit.helper";

// テスト用に必要なフィールドだけ埋めたGoalを作る
function makeGoal(status: string): Goal {
	return {
		id: `goal-${status}-${Math.round(status.length)}`,
		title: "テスト目標",
		deadline: "2026-12-31",
		category: "other",
		status,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	} as Goal;
}

describe("goalLimit.helper", () => {
	describe("countActiveGoals", () => {
		it("counts only active goals", () => {
			const goals = [makeGoal("active"), makeGoal("completed"), makeGoal("active")];
			expect(countActiveGoals(goals)).toBe(2);
		});

		it("returns 0 for an empty list", () => {
			expect(countActiveGoals([])).toBe(0);
		});
	});

	describe("canCreateGoal", () => {
		it("allows creation below the limit", () => {
			expect(canCreateGoal([makeGoal("active")], 2)).toBe(true);
		});

		it("blocks creation when active goals reach the limit", () => {
			expect(canCreateGoal([makeGoal("active"), makeGoal("active")], 2)).toBe(false);
		});

		it("ignores completed goals when checking the limit", () => {
			const goals = [makeGoal("active"), makeGoal("completed"), makeGoal("completed")];
			expect(canCreateGoal(goals, 2)).toBe(true);
		});
	});
});
