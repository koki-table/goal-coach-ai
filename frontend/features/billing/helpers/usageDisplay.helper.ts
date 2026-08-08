/**
 * 無料プランの本日の残り相談回数を表示用文字列にする
 * @param usedToday - 本日の目標確定後スレッドでの消費回数
 * @param limit - 1日あたりの上限
 * @returns "本日の残り: N回"（N は 0 以上にクランプ）
 */
export function formatFreeTierUsageLabel(usedToday: number, limit: number): string {
	const remaining = Math.max(limit - usedToday, 0);
	return `本日の残り: ${remaining}回`;
}
