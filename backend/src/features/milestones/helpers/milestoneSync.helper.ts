import type { MilestoneCreateRequest } from "../../../types/api";
import { isKrCompleted } from "./milestoneProgress.helper";

export type MilestoneSyncExisting = {
	id: string;
	isCompleted: number;
	startValue: number;
	currentValue: number;
	targetValue: number;
	unit: string;
};

export type MilestoneSyncUpdate = {
	id: string;
	title: string;
	label: string;
	sortOrder: number;
	startValue: number;
	currentValue: number;
	targetValue: number;
	unit: string;
	// 完了状態が既存から変化した場合のみセットされる（completedAt の更新判定に使う）。
	// 定量KRでは currentValue >= targetValue から導出する。
	isCompleted?: boolean;
};

export type MilestoneSyncInsert = {
	title: string;
	label: string;
	sortOrder: number;
	startValue: number;
	currentValue: number;
	targetValue: number;
	unit: string;
	isCompleted?: boolean;
};

export type MilestoneSyncResult = {
	toDelete: string[];
	toUpdate: MilestoneSyncUpdate[];
	toInsert: MilestoneSyncInsert[];
};

// 数値フィールドの既定値。未指定時は start=0 / current=0 / target=1 / unit=""（DBのdefaultと一致）。
const DEFAULT_START = 0;
const DEFAULT_CURRENT = 0;
const DEFAULT_TARGET = 1;

/**
 * 既存マイルストーンとリクエストentriesを突き合わせて差分を計算する。
 * - リクエストに含まれない既存id → 削除
 * - 既存idを持つentry → 更新（未指定の測定値は既存値を保持）
 * - idなし（または既存に存在しないid）のentry → 新規作成
 *
 * 完了状態(isCompleted)は entry.isCompleted を直接使わず、常に currentValue >= targetValue から導出する。
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
			// 未指定の測定値は既存値を保持し、＋更新で入れた進捗を編集操作で消さない
			const startValue = entry.startValue ?? current.startValue;
			const currentValue = entry.currentValue ?? current.currentValue;
			const targetValue = entry.targetValue ?? current.targetValue;
			const unit = entry.unit ?? current.unit;
			const completed = isKrCompleted(currentValue, targetValue, startValue);

			const update: MilestoneSyncUpdate = {
				id: current.id,
				title: entry.title,
				label: entry.label,
				sortOrder: entry.order,
				startValue,
				currentValue,
				targetValue,
				unit,
			};
			if (completed !== (current.isCompleted === 1)) {
				update.isCompleted = completed;
			}
			toUpdate.push(update);
		} else {
			const startValue = entry.startValue ?? DEFAULT_START;
			const currentValue = entry.currentValue ?? DEFAULT_CURRENT;
			const targetValue = entry.targetValue ?? DEFAULT_TARGET;
			const unit = entry.unit ?? "";
			const completed = isKrCompleted(currentValue, targetValue, startValue);
			toInsert.push({
				title: entry.title,
				label: entry.label,
				sortOrder: entry.order,
				startValue,
				currentValue,
				targetValue,
				unit,
				isCompleted: completed ? true : undefined,
			});
		}
	}

	const toDelete = existing.filter((m) => !keptIds.has(m.id)).map((m) => m.id);

	return { toDelete, toUpdate, toInsert };
}
