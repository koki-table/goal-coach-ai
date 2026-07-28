import { describe, expect, it } from "vitest";
import { countActiveGoals, isActiveGoalLimitReached } from "./goalLimit.helper";

describe("goalLimit.helper", () => {
	describe("countActiveGoals", () => {
		it("counts only goals with status active", () => {
			const goals = [
				{ status: "active" },
				{ status: "completed" },
				{ status: "active" },
				{ status: "archived" },
			];
			expect(countActiveGoals(goals)).toBe(2);
		});

		it("returns 0 when there are no goals", () => {
			expect(countActiveGoals([])).toBe(0);
		});
	});

	describe("isActiveGoalLimitReached", () => {
		it("is reached when active count equals the max", () => {
			const goals = [{ status: "active" }, { status: "active" }];
			expect(isActiveGoalLimitReached(goals, 2)).toBe(true);
		});

		it("is not reached when a completed goal keeps active count below max", () => {
			const goals = [{ status: "active" }, { status: "completed" }];
			expect(isActiveGoalLimitReached(goals, 2)).toBe(false);
		});

		it("is not reached when active count is below the max", () => {
			const goals = [{ status: "active" }];
			expect(isActiveGoalLimitReached(goals, 2)).toBe(false);
		});
	});
});
