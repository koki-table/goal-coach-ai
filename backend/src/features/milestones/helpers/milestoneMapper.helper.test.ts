import { describe, expect, it } from "vitest";
import { mapMilestoneToResponse } from "./milestoneMapper.helper";

describe("milestoneMapper helper", () => {
	describe("mapMilestoneToResponse", () => {
		it("maps DB milestone to response with boolean isCompleted and measurable fields", () => {
			const milestone = {
				id: "ms-1",
				goalId: "goal-1",
				title: "First milestone",
				label: "短期目標",
				sortOrder: 1,
				isCompleted: 0,
				startValue: 0,
				currentValue: 720,
				targetValue: 900,
				unit: "点",
				createdAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapMilestoneToResponse(milestone);

			expect(result).toEqual({
				id: "ms-1",
				goalId: "goal-1",
				title: "First milestone",
				label: "短期目標",
				order: 1,
				isCompleted: false,
				startValue: 0,
				currentValue: 720,
				targetValue: 900,
				unit: "点",
				createdAt: "2026-01-01T00:00:00.000Z",
			});
		});

		it("maps isCompleted 1 to true", () => {
			const milestone = {
				id: "ms-2",
				goalId: "goal-1",
				title: "Done milestone",
				label: null,
				sortOrder: 2,
				isCompleted: 1,
				startValue: 0,
				currentValue: 5,
				targetValue: 5,
				unit: "件",
				createdAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapMilestoneToResponse(milestone);

			expect(result.isCompleted).toBe(true);
			expect(result.label).toBe("");
		});

		it("maps sortOrder to order", () => {
			const milestone = {
				id: "ms-3",
				goalId: "goal-1",
				title: "Test",
				label: "中期目標",
				sortOrder: 5,
				isCompleted: 0,
				startValue: 0,
				currentValue: 0,
				targetValue: 1,
				unit: "",
				createdAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapMilestoneToResponse(milestone);
			expect(result.order).toBe(5);
		});
	});
});
