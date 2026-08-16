/**
 * 無料プランの本日の残り相談回数を計算する（0未満にはクランプする）
 */
export function calcFreeTierRemainingToday(usedToday: number, limit: number): number {
	return Math.max(limit - usedToday, 0);
}

/**
 * 無料プランの本日の残り相談回数を表示用文字列にする
 * @param usedToday - 本日の目標確定後スレッドでの消費回数
 * @param limit - 1日あたりの上限
 * @returns "本日の残り: N回"（N は 0 以上にクランプ）
 */
export function formatFreeTierUsageLabel(usedToday: number, limit: number): string {
	return `本日の残り: ${calcFreeTierRemainingToday(usedToday, limit)}回`;
}
