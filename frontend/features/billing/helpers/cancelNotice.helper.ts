// currentPeriodEndはサーバーが返すUTC ISO文字列。実行環境のタイムゾーンに
// 依存させないため、ローカル変換ではなくUTCのgetterで年月日を取り出す
function formatJapaneseDate(iso: string): string {
	const date = new Date(iso);
	return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

export function formatCancelNotice(currentPeriodEnd: string | undefined): string {
	if (!currentPeriodEnd) {
		return "現在の契約期間の終了後、無料プランに切り替わります。";
	}
	return `${formatJapaneseDate(currentPeriodEnd)}まで利用でき、その後は無料プランに切り替わります。`;
}
