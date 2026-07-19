import type { MilestoneCreateRequest } from "../../../types/api";

export type MilestoneSyncExisting = {
	id: string;
	isCompleted: number;
};

export type MilestoneSyncUpdate = {
	id: string;
	title: string;
	label: string;
	sortOrder: number;
	// isCompleted は既存と変化した場合のみセットされる（completedAt の更新判定に使う）
	isCompleted?: boolean;
};

export type MilestoneSyncInsert = {
	title: string;
	label: string;
	sortOrder: number;
	isCompleted?: boolean;
};

export type MilestoneSyncResult = {
	toDelete: string[];
	toUpdate: MilestoneSyncUpdate[];
	toInsert: MilestoneSyncInsert[];
};

/**
 * 既存マイルストーンとリクエストentriesを突き合わせて差分を計算する。
 * - リクエストに含まれない既存id → 削除
 * - 既存idを持つentry → 更新
 * - idなし（または既存に存在しないid）のentry → 新規作成
 */
export function calculateMilestoneSync(
	existing: MilestoneSyncExisting[],
	entries: MilestoneCreateRequest[],
): MilestoneSyncResult {
	const existingById = new Map(existing.map((m) => [m.id, m]));

	const toUpdate: MilestoneSyncUpdate[] = [];
	const toInsert: MilestoneSyncInsert[] = [];
	const keptIds = new Set<string>();

	for (const entry of entries) {
		const current = entry.id !== undefined ? existingById.get(entry.id) : undefined;
		if (current) {
			keptIds.add(current.id);
			const update: MilestoneSyncUpdate = {
				id: current.id,
				title: entry.title,
				label: entry.label,
				sortOrder: entry.order,
			};
			if (entry.isCompleted !== undefined && entry.isCompleted !== (current.isCompleted === 1)) {
				update.isCompleted = entry.isCompleted;
			}
			toUpdate.push(update);
		} else {
			toInsert.push({
				title: entry.title,
				label: entry.label,
				sortOrder: entry.order,
				isCompleted: entry.isCompleted,
			});
		}
	}

	const toDelete = existing.filter((m) => !keptIds.has(m.id)).map((m) => m.id);

	return { toDelete, toUpdate, toInsert };
}
