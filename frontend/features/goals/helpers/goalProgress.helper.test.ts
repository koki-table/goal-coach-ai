import { describe, expect, it } from "vitest";
import { calculateGoalProgress } from "./goalProgress.helper";

describe("calculateGoalProgress", () => {
	it("両方ゼロの場合は0を返す", () => {
		expect(
			calculateGoalProgress({
				totalTodos: 0,
				completedTodos: 0,
				totalMilestones: 0,
				completedMilestones: 0,
			}),
		).toBe(0);
	});

	it("TODOのみの場合はTODO完了率を返す", () => {
		expect(
			calculateGoalProgress({
				totalTodos: 10,
				completedTodos: 5,
				totalMilestones: 0,
				completedMilestones: 0,
			}),
		).toBe(50);
	});

	it("マイルストーンのみの場合はマイルストーン完了率を返す", () => {
		expect(
			calculateGoalProgress({
				totalTodos: 0,
				completedTodos: 0,
				totalMilestones: 3,
				completedMilestones: 1,
			}),
		).toBe(33);
	});

	it("TODO 70% + マイルストーン 30% の重み付き計算", () => {
		// TODO: 50%, Milestone: 100%
		// 50 * 0.7 + 100 * 0.3 = 35 + 30 = 65
		expect(
			calculateGoalProgress({
				totalTodos: 10,
				completedTodos: 5,
				totalMilestones: 2,
				completedMilestones: 2,
			}),
		).toBe(65);
	});

	it("全て完了の場合は100を返す", () => {
		expect(
			calculateGoalProgress({
				totalTodos: 5,
				completedTodos: 5,
				totalMilestones: 3,
				completedMilestones: 3,
			}),
		).toBe(100);
	});

	it("何も完了していない場合は0を返す", () => {
		expect(
			calculateGoalProgress({
				totalTodos: 5,
				completedTodos: 0,
				totalMilestones: 3,
				completedMilestones: 0,
			}),
		).toBe(0);
	});

	it("結果が四捨五入される", () => {
		// TODO: 1/3 = 33.33%, Milestone: 1/3 = 33.33%
		// 33.33 * 0.7 + 33.33 * 0.3 = 23.33 + 10.0 = 33.33 → 33
		expect(
			calculateGoalProgress({
				totalTodos: 3,
				completedTodos: 1,
				totalMilestones: 3,
				completedMilestones: 1,
			}),
		).toBe(33);
	});
});
