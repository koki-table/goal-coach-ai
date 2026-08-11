import { describe, expect, it } from "vitest";
import { calculateYearlyDiscount } from "./yearlyDiscount.helper";

describe("calculateYearlyDiscount", () => {
	it("calculates the discount percent and savings for the Pro plan pricing", () => {
		expect(calculateYearlyDiscount(980, 7800)).toEqual({
			discountPercent: 34,
			savingsJpy: 3960,
		});
	});

	it("returns 0 discount when yearly equals 12x monthly", () => {
		expect(calculateYearlyDiscount(1000, 12000)).toEqual({
			discountPercent: 0,
			savingsJpy: 0,
		});
	});

	it("returns a negative savings when yearly is priced higher than 12x monthly", () => {
		expect(calculateYearlyDiscount(1000, 13000)).toEqual({
			discountPercent: -8,
			savingsJpy: -1000,
		});
	});
});
