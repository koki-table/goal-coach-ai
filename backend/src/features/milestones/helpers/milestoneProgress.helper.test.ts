import { describe, expect, it } from "vitest";
import { isKrCompleted } from "./milestoneProgress.helper";

describe("isKrCompleted", () => {
	it("current >= target で完了", () => {
		expect(isKrCompleted(900, 900)).toBe(true);
		expect(isKrCompleted(1000, 900)).toBe(true);
	});

	it("current < target は未完了", () => {
		expect(isKrCompleted(720, 900)).toBe(false);
		expect(isKrCompleted(0, 1)).toBe(false);
	});

	it("startValueを考慮した達成判定", () => {
		expect(isKrCompleted(100, 100, 50)).toBe(true);
		expect(isKrCompleted(80, 100, 50)).toBe(false);
	});

	it("target <= start の不正設定は完了扱いにしない", () => {
		expect(isKrCompleted(5, 0)).toBe(false);
		expect(isKrCompleted(100, 50, 50)).toBe(false);
	});
});
