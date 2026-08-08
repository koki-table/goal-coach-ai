import { describe, expect, it } from "vitest";
import { formatFreeTierUsageLabel } from "./usageDisplay.helper";

describe("formatFreeTierUsageLabel", () => {
	it("returns the full remaining count when nothing has been used", () => {
		expect(formatFreeTierUsageLabel(0, 3)).toBe("本日の残り: 3回");
	});

	it("decreases the remaining count as usage increases", () => {
		expect(formatFreeTierUsageLabel(1, 3)).toBe("本日の残り: 2回");
		expect(formatFreeTierUsageLabel(2, 3)).toBe("本日の残り: 1回");
	});

	it("returns 0 remaining when usage reaches the limit", () => {
		expect(formatFreeTierUsageLabel(3, 3)).toBe("本日の残り: 0回");
	});

	it("clamps to 0 instead of going negative when usage exceeds the limit", () => {
		expect(formatFreeTierUsageLabel(4, 3)).toBe("本日の残り: 0回");
	});
});
