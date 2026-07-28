import { describe, expect, it } from "vitest";
import { type MilestoneSyncExisting, calculateMilestoneSync } from "./milestoneSync.helper";

// 測定値付きの既存マイルストーンを作るファクトリ（テストの意図に関係ない値は既定で埋める）
function existing(
	overrides: Partial<MilestoneSyncExisting> & { id: string },
): MilestoneSyncExisting {
	return {
		isCompleted: 0,
		startValue: 0,
		currentValue: 0,
		targetValue: 1,
		unit: "",
		...overrides,
	};
}

describe("milestoneSync helper", () => {
	describe("calculateMilestoneSync", () => {
		it("marks existing milestones not in entries as toDelete", () => {
			const result = calculateMilestoneSync(
				[existing({ id: "ms-1" }), existing({ id: "ms-2" })],
				[{ id: "ms-1", title: "残す", label: "短期目標", order: 1 }],
			);

			expect(result.toDelete).toEqual(["ms-2"]);
		});

		it("marks entries with existing id as toUpdate and preserves current progress when omitted", () => {
			const result = calculateMilestoneSync(
				[existing({ id: "ms-1", currentValue: 3, targetValue: 5, unit: "件" })],
				[{ id: "ms-1", title: "更新後", label: "中期目標", order: 2 }],
			);

			expect(result.toUpdate).toEqual([
				{
					id: "ms-1",
					title: "更新後",
					label: "中期目標",
					sortOrder: 2,
					startValue: 0,
					currentValue: 3,
					targetValue: 5,
					unit: "件",
				},
			]);
			expect(result.toDelete).toEqual([]);
			expect(result.toInsert).toEqual([]);
		});

		it("derives isCompleted from currentValue >= targetValue on update", () => {
			const result = calculateMilestoneSync(
				[
					existing({ id: "ms-1", isCompleted: 0, currentValue: 0, targetValue: 5 }),
					existing({ id: "ms-2", isCompleted: 1, currentValue: 5, targetValue: 5 }),
				],
				[
					// current を target まで上げる → 完了へ変化
					{
						id: "ms-1",
						title: "達成",
						label: "短期目標",
						order: 1,
						currentValue: 5,
						targetValue: 5,
					},
					// 完了のまま（変化なし）
					{
						id: "ms-2",
						title: "完了のまま",
						label: "中期目標",
						order: 2,
						currentValue: 5,
						targetValue: 5,
					},
				],
			);

			expect(result.toUpdate[0].isCompleted).toBe(true);
			expect(result.toUpdate[1].isCompleted).toBeUndefined();
		});

		it("marks entries without id as toInsert with resolved numeric fields", () => {
			const result = calculateMilestoneSync(
				[existing({ id: "ms-1" })],
				[
					{ id: "ms-1", title: "既存", label: "短期目標", order: 1 },
					{ title: "新規", label: "長期目標", order: 2, targetValue: 900, unit: "点" },
				],
			);

			expect(result.toInsert).toEqual([
				{
					title: "新規",
					label: "長期目標",
					sortOrder: 2,
					startValue: 0,
					currentValue: 0,
					targetValue: 900,
					unit: "点",
					isCompleted: undefined,
				},
			]);
		});

		it("treats unknown id as toInsert (id is ignored)", () => {
			const result = calculateMilestoneSync(
				[existing({ id: "ms-1" })],
				[{ id: "unknown-id", title: "別goalのidなど", label: "短期目標", order: 1 }],
			);

			expect(result.toInsert).toEqual([
				{
					title: "別goalのidなど",
					label: "短期目標",
					sortOrder: 1,
					startValue: 0,
					currentValue: 0,
					targetValue: 1,
					unit: "",
					isCompleted: undefined,
				},
			]);
			expect(result.toDelete).toEqual(["ms-1"]);
			expect(result.toUpdate).toEqual([]);
		});

		it("deletes everything when entries is empty", () => {
			const result = calculateMilestoneSync(
				[existing({ id: "ms-1" }), existing({ id: "ms-2", isCompleted: 1 })],
				[],
			);

			expect(result.toDelete).toEqual(["ms-1", "ms-2"]);
			expect(result.toUpdate).toEqual([]);
			expect(result.toInsert).toEqual([]);
		});

		it("inserts everything when existing is empty", () => {
			const result = calculateMilestoneSync(
				[],
				[
					{ title: "A", label: "短期目標", order: 1 },
					{ title: "B", label: "中期目標", order: 2 },
				],
			);

			expect(result.toDelete).toEqual([]);
			expect(result.toInsert).toHaveLength(2);
		});
	});
});
