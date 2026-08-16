import { describe, expect, it } from "vitest";
import { formatCancelNotice } from "./cancelNotice.helper";

describe("formatCancelNotice", () => {
	it("includes the formatted currentPeriodEnd date when provided", () => {
		expect(formatCancelNotice("2026-09-12T00:00:00.000Z")).toBe(
			"2026年9月12日まで利用でき、その後は無料プランに切り替わります。",
		);
	});

	it("falls back to a generic notice when currentPeriodEnd is missing", () => {
		expect(formatCancelNotice(undefined)).toBe(
			"現在の契約期間の終了後、無料プランに切り替わります。",
		);
	});
});
