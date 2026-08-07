import type { Goal } from "@/features/goals/types";
import { describe, expect, it } from "vitest";
import { parseThreadTarget, shouldStartExploration } from "./coachThreadTarget.helper";

function makeGoal(status: string): Goal {
	return {
		id: "1",
		status,
		title: "x",
		deadline: "",
		category: "other",
		createdAt: "",
		updatedAt: "",
	};
}

describe("coachThreadTarget.helper", () => {
	describe("parseThreadTarget", () => {
		it("returns a goal target when goalId is present", () => {
			const params = new URLSearchParams({ goalId: "goal-1" });
			expect(parseThreadTarget(params)).toEqual({ kind: "goal", goalId: "goal-1" });
		});

		it("returns an exploration target when thread=exploration", () => {
			const params = new URLSearchParams({ thread: "exploration" });
			expect(parseThreadTarget(params)).toEqual({ kind: "exploration" });
		});

		it("prefers goalId over thread=exploration when both are present", () => {
			const params = new URLSearchParams({ goalId: "goal-1", thread: "exploration" });
			expect(parseThreadTarget(params)).toEqual({ kind: "goal", goalId: "goal-1" });
		});

		it("returns undefined when neither is present", () => {
			const params = new URLSearchParams();
			expect(parseThreadTarget(params)).toBeUndefined();
		});
	});

	describe("shouldStartExploration", () => {
		it("returns true when there are no active goals", () => {
			expect(shouldStartExploration([])).toBe(true);
		});

		it("returns true when goals exist but none are active", () => {
			expect(shouldStartExploration([makeGoal("completed")])).toBe(true);
		});

		it("returns false when at least one active goal exists", () => {
			expect(shouldStartExploration([makeGoal("active")])).toBe(false);
		});
	});
});
