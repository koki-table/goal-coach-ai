import type { MilestoneEntry } from "../schemas/todoSchema";
import { MAX_MILESTONES_PER_GOAL } from "../schemas/todoSchema";
import type { Milestone } from "../types";

/**
 * Milestone[] をフォーム用の MilestoneEntry[] に変換する
 */
export function milestonesToFormEntries(milestones: Milestone[]): MilestoneEntry[] {
	if (milestones.length === 0) {
		return [{ label: "", title: "", isCompleted: false }];
	}
	return [...milestones]
		.sort((a, b) => a.order - b.order)
		.map((m) => ({
			label: m.label,
			title: m.title,
			isCompleted: m.isCompleted,
		}));
}

export type MilestoneValidationError = {
	index: number;
	field: "label" | "title";
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
	}

	return errors;
}
