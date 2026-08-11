/**
 * 年払いの割引率とお得額を算出する
 * @param monthlyPriceJpy - 月額料金
 * @param yearlyPriceJpy - 年額料金
 * @returns 割引率（%、四捨五入）とお得額（円）
 */
export function calculateYearlyDiscount(
	monthlyPriceJpy: number,
	yearlyPriceJpy: number,
): { discountPercent: number; savingsJpy: number } {
	const yearlyEquivalentOfMonthly = monthlyPriceJpy * 12;
	const savingsJpy = yearlyEquivalentOfMonthly - yearlyPriceJpy;
	const discountPercent = Math.round((savingsJpy / yearlyEquivalentOfMonthly) * 100);
	return { discountPercent, savingsJpy };
}
