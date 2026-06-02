import { describe, expect, it } from "vitest";
import { milestonesToFormEntries, validateMilestoneEntries } from "./milestone.helper";
import type { Milestone } from "../types";

describe("milestonesToFormEntries", () => {
	it("空配列の場合、デフォルトエントリを1つ返す", () => {
		const result = milestonesToFormEntries([]);
		expect(result).toEqual([{ label: "", title: "", isCompleted: false }]);
	});

	it("マイルストーンをorder順にソートして変換する", () => {
		const milestones: Milestone[] = [
			{
				id: "m-3",
				goalId: "goal-1",
				title: "長期",
				label: "長期目標",
				order: 3,
				isCompleted: false,
				createdAt: "2026-01-01T00:00:00.000Z",
			},
			{
				id: "m-1",
				goalId: "goal-1",
				title: "短期",
				label: "短期目標",
				order: 1,
				isCompleted: true,
				createdAt: "2026-01-01T00:00:00.000Z",
			},
			{
				id: "m-2",
				goalId: "goal-1",
				title: "中期",
				label: "中期目標",
				order: 2,
				isCompleted: false,
				createdAt: "2026-01-01T00:00:00.000Z",
			},
		];

		const result = milestonesToFormEntries(milestones);
		expect(result).toEqual([
			{ label: "短期目標", title: "短期", isCompleted: true },
			{ label: "中期目標", title: "中期", isCompleted: false },
			{ label: "長期目標", title: "長期", isCompleted: false },
		]);
	});

	it("元の配列を変更しない", () => {
		const milestones: Milestone[] = [
			{
				id: "m-2",
				goalId: "goal-1",
				title: "B",
				label: "Step 2",
				order: 2,
				isCompleted: false,
				createdAt: "2026-01-01T00:00:00.000Z",
			},
			{
				id: "m-1",
				goalId: "goal-1",
				title: "A",
				label: "Step 1",
				order: 1,
				isCompleted: true,
				createdAt: "2026-01-01T00:00:00.000Z",
			},
		];

		const originalFirst = milestones[0];
		milestonesToFormEntries(milestones);
		expect(milestones[0]).toBe(originalFirst);
	});
});

describe("validateMilestoneEntries", () => {
	it("空配列の場合、エラーを返す", () => {
		const errors = validateMilestoneEntries([]);
		expect(errors.length).toBe(1);
		expect(errors[0].message).toBe("最低1つのマイルストーンが必要です");
	});

	it("上限超過の場合、エラーを返す", () => {
		const entries = Array.from({ length: 11 }, (_, i) => ({
			label: `Step ${i + 1}`,
			title: `Title ${i + 1}`,
			isCompleted: false,
		}));

		const errors = validateMilestoneEntries(entries);
		expect(errors.some((e) => e.message.includes("10個以内"))).toBe(true);
	});

	it("空文字ラベルの場合、エラーを返す", () => {
		const entries = [{ label: "", title: "Valid title", isCompleted: false }];
		const errors = validateMilestoneEntries(entries);
		expect(errors.some((e) => e.field === "label" && e.message === "ラベルは必須です")).toBe(true);
	});

	it("空文字タイトルの場合、エラーを返す", () => {
		const entries = [{ label: "Valid label", title: "", isCompleted: false }];
		const errors = validateMilestoneEntries(entries);
		expect(errors.some((e) => e.field === "title" && e.message === "タイトルは必須です")).toBe(true);
	});

	it("30文字超過ラベルの場合、エラーを返す", () => {
		const entries = [{ label: "a".repeat(31), title: "Valid title", isCompleted: false }];
		const errors = validateMilestoneEntries(entries);
		expect(errors.some((e) => e.field === "label" && e.message.includes("30文字"))).toBe(true);
	});

	it("100文字超過タイトルの場合、エラーを返す", () => {
		const entries = [{ label: "Valid label", title: "a".repeat(101), isCompleted: false }];
		const errors = validateMilestoneEntries(entries);
		expect(errors.some((e) => e.field === "title" && e.message.includes("100文字"))).toBe(true);
	});

	it("正常なエントリの場合、エラーなし", () => {
		const entries = [
			{ label: "短期目標", title: "毎日学習", isCompleted: true },
			{ label: "中期目標", title: "模試受験", isCompleted: false },
			{ label: "長期目標", title: "本番達成", isCompleted: false },
		];
		const errors = validateMilestoneEntries(entries);
		expect(errors).toEqual([]);
	});

	it("スペースのみのラベルの場合、エラーを返す", () => {
		const entries = [{ label: "   ", title: "Valid title", isCompleted: false }];
		const errors = validateMilestoneEntries(entries);
		expect(errors.some((e) => e.field === "label" && e.message === "ラベルは必須です")).toBe(true);
	});

	it("複数エントリのバリデーションでインデックスが正しい", () => {
		const entries = [
			{ label: "Valid", title: "Valid", isCompleted: false },
			{ label: "", title: "Valid", isCompleted: false },
			{ label: "Valid", title: "", isCompleted: false },
		];
		const errors = validateMilestoneEntries(entries);
		expect(errors).toEqual([
			{ index: 1, field: "label", message: "ラベルは必須です" },
			{ index: 2, field: "title", message: "タイトルは必須です" },
		]);
	});
});
