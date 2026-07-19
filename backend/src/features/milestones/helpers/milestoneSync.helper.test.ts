import { describe, expect, it } from "vitest";
import { calculateMilestoneSync } from "./milestoneSync.helper";

describe("milestoneSync helper", () => {
	describe("calculateMilestoneSync", () => {
		it("marks existing milestones not in entries as toDelete", () => {
			const existing = [
				{ id: "ms-1", isCompleted: 0 },
				{ id: "ms-2", isCompleted: 0 },
			];
			const entries = [{ id: "ms-1", title: "残す", label: "短期目標", order: 1 }];

			const result = calculateMilestoneSync(existing, entries);

			expect(result.toDelete).toEqual(["ms-2"]);
		});

		it("marks entries with existing id as toUpdate", () => {
			const existing = [{ id: "ms-1", isCompleted: 0 }];
			const entries = [{ id: "ms-1", title: "更新後", label: "中期目標", order: 2 }];

			const result = calculateMilestoneSync(existing, entries);

			expect(result.toUpdate).toEqual([
				{ id: "ms-1", title: "更新後", label: "中期目標", sortOrder: 2 },
			]);
			expect(result.toDelete).toEqual([]);
			expect(result.toInsert).toEqual([]);
		});

		it("marks entries without id as toInsert", () => {
			const existing = [{ id: "ms-1", isCompleted: 0 }];
			const entries = [
				{ id: "ms-1", title: "既存", label: "短期目標", order: 1 },
				{ title: "新規", label: "長期目標", order: 2, isCompleted: false },
			];

			const result = calculateMilestoneSync(existing, entries);

			expect(result.toInsert).toEqual([
				{ title: "新規", label: "長期目標", sortOrder: 2, isCompleted: false },
			]);
		});

		it("treats unknown id as toInsert (id is ignored)", () => {
			const existing = [{ id: "ms-1", isCompleted: 0 }];
			const entries = [
				{
					id: "unknown-id",
					title: "別goalのidなど",
					label: "短期目標",
					order: 1,
				},
			];

			const result = calculateMilestoneSync(existing, entries);

			expect(result.toInsert).toEqual([
				{
					title: "別goalのidなど",
					label: "短期目標",
					sortOrder: 1,
					isCompleted: undefined,
				},
			]);
			expect(result.toDelete).toEqual(["ms-1"]);
			expect(result.toUpdate).toEqual([]);
		});

		it("sets isCompleted on update only when it changed", () => {
			const existing = [
				{ id: "ms-1", isCompleted: 0 },
				{ id: "ms-2", isCompleted: 1 },
			];
			const entries = [
				{
					id: "ms-1",
					title: "完了にする",
					label: "短期目標",
					order: 1,
					isCompleted: true,
				},
				{
					id: "ms-2",
					title: "完了のまま",
					label: "中期目標",
					order: 2,
					isCompleted: true,
				},
			];

			const result = calculateMilestoneSync(existing, entries);

			expect(result.toUpdate[0].isCompleted).toBe(true);
			expect(result.toUpdate[1].isCompleted).toBeUndefined();
		});

		it("does not touch isCompleted when entry omits it", () => {
			const existing = [{ id: "ms-1", isCompleted: 1 }];
			const entries = [{ id: "ms-1", title: "タイトルのみ更新", label: "短期目標", order: 1 }];

			const result = calculateMilestoneSync(existing, entries);

			expect(result.toUpdate[0].isCompleted).toBeUndefined();
		});

		it("deletes everything when entries is empty", () => {
			const existing = [
				{ id: "ms-1", isCompleted: 0 },
				{ id: "ms-2", isCompleted: 1 },
			];

			const result = calculateMilestoneSync(existing, []);

			expect(result.toDelete).toEqual(["ms-1", "ms-2"]);
			expect(result.toUpdate).toEqual([]);
			expect(result.toInsert).toEqual([]);
		});

		it("inserts everything when existing is empty", () => {
			const entries = [
				{ title: "A", label: "短期目標", order: 1 },
				{ title: "B", label: "中期目標", order: 2 },
			];

			const result = calculateMilestoneSync([], entries);

			expect(result.toDelete).toEqual([]);
			expect(result.toInsert).toHaveLength(2);
		});
	});
});
