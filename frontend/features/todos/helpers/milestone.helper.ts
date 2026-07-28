import {
	DEFAULT_CURRENT_VALUE,
	DEFAULT_START_VALUE,
	DEFAULT_TARGET_VALUE,
	DEFAULT_UNIT,
	PROGRESS_MAX_PERCENT,
	PROGRESS_MIN_PERCENT,
} from "../config/milestoneConfig";
import type { MilestoneEntry } from "../schemas/todoSchema";
import { MAX_MILESTONES_PER_GOAL } from "../schemas/todoSchema";
import type { Milestone } from "../types";

// 進捗計算に必要な測定値だけを受け取る構造的な型（Milestoneでもフォーム値でも渡せる）
type MilestoneMeasurable = {
	startValue: number;
	currentValue: number;
	targetValue: number;
};

/**
 * 定量KRの進捗率（0〜100の整数）を返す。
 * 進捗% = clamp((current - start) / (target - start), 0, 1) × 100
 * target <= start の不正設定は0%とする（0除算・意図しない値を避ける）。
 */
export function computeKrProgress(m: MilestoneMeasurable): number {
	const denominator = m.targetValue - m.startValue;
	if (denominator <= 0) return PROGRESS_MIN_PERCENT;
	const ratio = (m.currentValue - m.startValue) / denominator;
	const clamped = Math.min(Math.max(ratio, 0), 1);
	return Math.round(clamped * PROGRESS_MAX_PERCENT);
}

/**
 * 全KRの進捗率の平均（0〜100の整数）。空配列は0。
 */
export function computeOverallProgress(milestones: MilestoneMeasurable[]): number {
	if (milestones.length === 0) return PROGRESS_MIN_PERCENT;
	const total = milestones.reduce((sum, m) => sum + computeKrProgress(m), 0);
	return Math.round(total / milestones.length);
}

/**
 * KRが達成済みか（current >= target）。target <= start の不正設定は未達成。
 */
export function isKrCompleted(m: MilestoneMeasurable): boolean {
	if (m.targetValue <= m.startValue) return false;
	return m.currentValue >= m.targetValue;
}

/**
 * Milestone[] をフォーム用の MilestoneEntry[] に変換する。
 * currentValue/startValue は既存値を保持して往復させ、編集で進捗を消さないようにする。
 */
export function milestonesToFormEntries(milestones: Milestone[]): MilestoneEntry[] {
	if (milestones.length === 0) {
		return [
			{
				label: "",
				title: "",
				targetValue: DEFAULT_TARGET_VALUE,
				unit: DEFAULT_UNIT,
				currentValue: DEFAULT_CURRENT_VALUE,
				startValue: DEFAULT_START_VALUE,
			},
		];
	}
	return [...milestones]
		.sort((a, b) => a.order - b.order)
		.map((m) => ({
			id: m.id,
			label: m.label,
			title: m.title,
			targetValue: m.targetValue,
			unit: m.unit,
			currentValue: m.currentValue,
			startValue: m.startValue,
		}));
}

export type MilestoneValidationError = {
	index: number;
	field: "label" | "title" | "targetValue";
	message: string;
};

/**
 * MilestoneEntry[] のバリデーションを行い、エラー配列を返す
 */
export function validateMilestoneEntries(entries: MilestoneEntry[]): MilestoneValidationError[] {
	const errors: MilestoneValidationError[] = [];

	if (entries.length === 0) {
		errors.push({
			index: 0,
			field: "label",
			message: "主要な成果（Key Results）は最低1つ必要です",
		});
		return errors;
	}

	if (entries.length > MAX_MILESTONES_PER_GOAL) {
		errors.push({
			index: entries.length - 1,
			field: "label",
			message: `主要な成果（Key Results）は${MAX_MILESTONES_PER_GOAL}個以内です`,
		});
	}

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (!entry.label || entry.label.trim() === "") {
			errors.push({ index: i, field: "label", message: "ラベルは必須です" });
		} else if (entry.label.length > 30) {
			errors.push({ index: i, field: "label", message: "ラベルは30文字以内で入力してください" });
		}

		if (!entry.title || entry.title.trim() === "") {
			errors.push({ index: i, field: "title", message: "タイトルは必須です" });
		} else if (entry.title.length > 100) {
			errors.push({ index: i, field: "title", message: "タイトルは100文字以内で入力してください" });
		}

		if (!(entry.targetValue > 0)) {
			errors.push({
				index: i,
				field: "targetValue",
				message: "目標値は0より大きい値を入力してください",
			});
		}
	}

	return errors;
}
