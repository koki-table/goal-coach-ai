import { describe, expect, it } from "vitest";
import { getSuccessRateStyle } from "./successRateStyle.helper";

describe("getSuccessRateStyle", () => {
	it("70以上は順調", () => {
		expect(getSuccessRateStyle(70).label).toBe("順調");
		expect(getSuccessRateStyle(100).label).toBe("順調");
	});

	it("40〜69は要注意", () => {
		expect(getSuccessRateStyle(40).label).toBe("要注意");
		expect(getSuccessRateStyle(69).label).toBe("要注意");
	});

	it("40未満は危険", () => {
		expect(getSuccessRateStyle(39).label).toBe("危険");
		expect(getSuccessRateStyle(0).label).toBe("危険");
	});
});
