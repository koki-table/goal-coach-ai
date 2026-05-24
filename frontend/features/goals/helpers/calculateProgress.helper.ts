/**
 * 目標の進捗率を計算する
 * @param completed - 完了したタスク数
 * @param total - 全タスク数
 * @returns 0〜100の進捗率（%）
 */
export function calculateProgress(completed: number, total: number): number {
	if (total <= 0) return 0;
	if (completed < 0) return 0;
	if (completed >= total) return 100;
	return Math.round((completed / total) * 100);
}
