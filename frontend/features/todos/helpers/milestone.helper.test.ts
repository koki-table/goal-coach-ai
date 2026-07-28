import { describe, expect, it } from "vitest";
import type { MilestoneEntry } from "../schemas/todoSchema";
import type { Milestone } from "../types";
import {
	computeKrProgress,
	computeOverallProgress,
	isKrCompleted,
	milestonesToFormEntries,
	validateMilestoneEntries,
} from "./milestone.helper";

// テスト用のMilestoneファクトリ（意図に関係ないフィールドは既定値で埋める）
function milestone(overrides: Partial<Milestone> & { id: string }): Milestone {
	return {
		goalId: "goal-1",
		title: "KR",
		label: "ラベル",
		order: 1,
		isCompleted: false,
		startValue: 0,
		currentValue: 0,
		targetValue: 100,
		unit: "",
		createdAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

// 正常な入力エントリ
function entry(overrides: Partial<MilestoneEntry> = {}): MilestoneEntry {
	return {
		label: "短期目標",
		title: "毎日学習",
		targetValue: 100,
		unit: "点",
		currentValue: 0,
		startValue: 0,
		...overrides,
	};
}

describe("computeKrProgress", () => {
	it("current/target から進捗率(整数%)を返す", () => {
		expect(computeKrProgress({ startValue: 0, currentValue: 720, targetValue: 900 })).toBe(80);
		expect(computeKrProgress({ startValue: 0, currentValue: 0, targetValue: 900 })).toBe(0);
		expect(computeKrProgress({ startValue: 0, currentValue: 900, targetValue: 900 })).toBe(100);
	});

	it("startValueを考慮する", () => {
		expect(computeKrProgress({ startValue: 50, currentValue: 75, targetValue: 100 })).toBe(50);
	});

	it("target超過は100%にクランプ、負は0%にクランプ", () => {
		expect(computeKrProgress({ startValue: 0, currentValue: 1200, targetValue: 900 })).toBe(100);
		expect(computeKrProgress({ startValue: 10, currentValue: 5, targetValue: 100 })).toBe(0);
	});

	it("target <= start の不正設定は0%", () => {
		expect(computeKrProgress({ startValue: 0, currentValue: 5, targetValue: 0 })).toBe(0);
		expect(computeKrProgress({ startValue: 50, currentValue: 100, targetValue: 50 })).toBe(0);
	});
});

describe("computeOverallProgress", () => {
	it("各KRの進捗率の平均を返す", () => {
		const result = computeOverallProgress([
			{ startValue: 0, currentValue: 80, targetValue: 100 }, // 80
			{ startValue: 0, currentValue: 60, targetValue: 100 }, // 60
		]);
		expect(result).toBe(70);
	});

	it("空配列は0", () => {
		expect(computeOverallProgress([])).toBe(0);
	});
});

describe("isKrCompleted", () => {
	it("current >= target で完了", () => {
		expect(isKrCompleted({ startValue: 0, currentValue: 100, targetValue: 100 })).toBe(true);
	});
	it("current < target は未完了", () => {
		expect(isKrCompleted({ startValue: 0, currentValue: 80, targetValue: 100 })).toBe(false);
	});
	it("target <= start は未完了", () => {
		expect(isKrCompleted({ startValue: 50, currentValue: 100, targetValue: 50 })).toBe(false);
	});
});

describe("milestonesToFormEntries", () => {
	it("空配列の場合、デフォルトエントリを1つ返す", () => {
		const result = milestonesToFormEntries([]);
		expect(result).toEqual([
			{ label: "", title: "", targetValue: 100, unit: "%", currentValue: 0, startValue: 0 },
		]);
	});

	it("マイルストーンをorder順にソートし測定値を保持して変換する", () => {
		const result = milestonesToFormEntries([
			milestone({ id: "m-2", title: "中期", label: "中期目標", order: 2 }),
			milestone({
				id: "m-1",
				title: "短期",
				label: "短期目標",
				order: 1,
				currentValue: 720,
				targetValue: 900,
				unit: "点",
			}),
		]);

		expect(result).toEqual([
			{
				id: "m-1",
				label: "短期目標",
				title: "短期",
				targetValue: 900,
				unit: "点",
				currentValue: 720,
				startValue: 0,
			},
			{
				id: "m-2",
				label: "中期目標",
				title: "中期",
				targetValue: 100,
				unit: "",
				currentValue: 0,
				startValue: 0,
			},
		]);
	});

	it("元の配列を変更しない", () => {
		const milestones = [milestone({ id: "m-2", order: 2 }), milestone({ id: "m-1", order: 1 })];
		const originalFirst = milestones[0];
		milestonesToFormEntries(milestones);
		expect(milestones[0]).toBe(originalFirst);
	});
});

describe("validateMilestoneEntries", () => {
	it("空配列の場合、エラーを返す", () => {
		const errors = validateMilestoneEntries([]);
		expect(errors.length).toBe(1);
		expect(errors[0].message).toBe("主要な成果（Key Results）は最低1つ必要です");
	});

	it("上限超過の場合、エラーを返す", () => {
		const entries = Array.from({ length: 11 }, (_, i) =>
			entry({ label: `Step ${i + 1}`, title: `Title ${i + 1}` }),
		);
		const errors = validateMilestoneEntries(entries);
		expect(errors.some((e) => e.message.includes("10個以内"))).toBe(true);
	});

	it("空文字ラベルの場合、エラーを返す", () => {
		const errors = validateMilestoneEntries([entry({ label: "" })]);
		expect(errors.some((e) => e.field === "label" && e.message === "ラベルは必須です")).toBe(true);
	});

	it("空文字タイトルの場合、エラーを返す", () => {
		const errors = validateMilestoneEntries([entry({ title: "" })]);
		expect(errors.some((e) => e.field === "title" && e.message === "タイトルは必須です")).toBe(
			true,
		);
	});

	it("目標値が0以下の場合、エラーを返す", () => {
		const errors = validateMilestoneEntries([entry({ targetValue: 0 })]);
		expect(errors.some((e) => e.field === "targetValue")).toBe(true);
	});

	it("30文字超過ラベルの場合、エラーを返す", () => {
		const errors = validateMilestoneEntries([entry({ label: "a".repeat(31) })]);
		expect(errors.some((e) => e.field === "label" && e.message.includes("30文字"))).toBe(true);
	});

	it("100文字超過タイトルの場合、エラーを返す", () => {
		const errors = validateMilestoneEntries([entry({ title: "a".repeat(101) })]);
		expect(errors.some((e) => e.field === "title" && e.message.includes("100文字"))).toBe(true);
	});

	it("正常なエントリの場合、エラーなし", () => {
		const errors = validateMilestoneEntries([
			entry({ label: "短期目標", title: "毎日学習" }),
			entry({ label: "中期目標", title: "模試受験" }),
		]);
		expect(errors).toEqual([]);
	});

	it("複数エントリのバリデーションでインデックスが正しい", () => {
		const errors = validateMilestoneEntries([entry(), entry({ label: "" }), entry({ title: "" })]);
		expect(errors).toEqual([
			{ index: 1, field: "label", message: "ラベルは必須です" },
			{ index: 2, field: "title", message: "タイトルは必須です" },
		]);
	});
});
