import { describe, expect, it } from "vitest";
import { calculateProgress } from "./calculateProgress.helper";

describe("calculateProgress", () => {
	it("returns 0 when total is 0", () => {
		expect(calculateProgress(0, 0)).toBe(0);
	});

	it("returns 0 when total is negative", () => {
		expect(calculateProgress(0, -1)).toBe(0);
	});

	it("returns 0 when completed is negative", () => {
		expect(calculateProgress(-1, 10)).toBe(0);
	});

	it("returns 100 when all tasks are completed", () => {
		expect(calculateProgress(5, 5)).toBe(100);
	});

	it("returns 100 when completed exceeds total", () => {
		expect(calculateProgress(10, 5)).toBe(100);
	});

	it("calculates correct percentage", () => {
		expect(calculateProgress(3, 10)).toBe(30);
	});

	it("rounds to nearest integer", () => {
		expect(calculateProgress(1, 3)).toBe(33);
		expect(calculateProgress(2, 3)).toBe(67);
	});
});
