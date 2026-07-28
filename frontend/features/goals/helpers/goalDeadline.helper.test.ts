import { describe, expect, it } from "vitest";
import { computeDaysRemaining } from "./goalDeadline.helper";

describe("goalDeadline.helper", () => {
	describe("computeDaysRemaining", () => {
		it("returns 0 when the deadline is today", () => {
			const now = new Date(2026, 6, 27, 23, 59);
			expect(computeDaysRemaining("2026-07-27", now)).toBe(0);
		});

		it("returns 0 even right after midnight on the deadline day", () => {
			const now = new Date(2026, 6, 27, 0, 0, 1);
			expect(computeDaysRemaining("2026-07-27", now)).toBe(0);
		});

		it("returns -1 when the deadline was yesterday", () => {
			const now = new Date(2026, 6, 27, 9, 0);
			expect(computeDaysRemaining("2026-07-26", now)).toBe(-1);
		});

		it("returns 1 when the deadline is tomorrow", () => {
			const now = new Date(2026, 6, 27, 9, 0);
			expect(computeDaysRemaining("2026-07-28", now)).toBe(1);
		});

		it("ignores time of day for both deadline and now", () => {
			const morning = new Date(2026, 6, 27, 0, 0, 0);
			const night = new Date(2026, 6, 27, 23, 59, 59);
			expect(computeDaysRemaining("2026-07-27", morning)).toBe(
				computeDaysRemaining("2026-07-27", night),
			);
		});
	});
});
