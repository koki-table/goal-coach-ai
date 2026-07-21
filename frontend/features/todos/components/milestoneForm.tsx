"use client";

import { Button } from "@/components/atom/button";
import { Input } from "@/components/atom/input";
import { cn } from "@/lib/utils";
import { Check, Plus, Trash, X } from "@phosphor-icons/react";
import { useState } from "react";
import type { MilestoneEntry } from "../schemas/todoSchema";
import { MAX_MILESTONES_PER_GOAL } from "../schemas/todoSchema";
import type { Milestone } from "../types";

type MilestoneFormProps = {
	milestones: Milestone[];
	onSave: (data: MilestoneEntry[]) => Promise<void>;
	onCancel: () => void;
	className?: string;
};

export function MilestoneForm({ milestones, onSave, onCancel, className }: MilestoneFormProps) {
	// 既存のマイルストーンからフォームデータを初期化
	const initialEntries: MilestoneEntry[] =
		milestones.length > 0
			? [...milestones]
					.sort((a, b) => a.order - b.order)
					.map((m) => ({
						id: m.id,
						label: m.label,
						title: m.title,
						isCompleted: m.isCompleted,
					}))
			: [{ label: "", title: "", isCompleted: false }];

	const [entries, setEntries] = useState<MilestoneEntry[]>(initialEntries);
	const [isSaving, setIsSaving] = useState(false);

	const handleEntryChange = (
		index: number,
		field: keyof MilestoneEntry,
		value: string | boolean,
	) => {
		setEntries((prev) =>
			prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
		);
	};

	const handleAddEntry = () => {
		if (entries.length >= MAX_MILESTONES_PER_GOAL) return;
		setEntries((prev) => [...prev, { label: "", title: "", isCompleted: false }]);
	};

	const handleRemoveEntry = (index: number) => {
		if (entries.length <= 1) return;
		setEntries((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const hasEmpty = entries.some((entry) => !entry.label || !entry.title);
		if (hasEmpty) return;

		setIsSaving(true);
		try {
			await onSave(entries);
		} finally {
			setIsSaving(false);
		}
	};

	const isValid = entries.every((entry) => entry.label && entry.title);

	return (
		<form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
			<div className="space-y-3">
				{entries.map((entry, index) => (
					<div key={index} className="flex items-start gap-2">
						{/* 完了トグル */}
						<button
							type="button"
							onClick={() => handleEntryChange(index, "isCompleted", !entry.isCompleted)}
							className={cn(
								"mt-2 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
								entry.isCompleted
									? "border-primary bg-primary text-primary-foreground"
									: "border-muted-foreground/30 hover:border-primary/50",
							)}
						>
							{entry.isCompleted && <Check weight="bold" className="size-3" />}
						</button>

						{/* ラベル入力 */}
						<Input
							value={entry.label}
							onChange={(e) => handleEntryChange(index, "label", e.target.value)}
							placeholder="ラベル（例: 短期目標）"
							className="w-28 shrink-0 text-sm"
							maxLength={30}
						/>

						{/* タイトル入力 */}
						<Input
							value={entry.title}
							onChange={(e) => handleEntryChange(index, "title", e.target.value)}
							placeholder="目標内容を入力"
							className="flex-1 text-sm"
							maxLength={100}
						/>

						{/* 削除ボタン */}
						<button
							type="button"
							onClick={() => handleRemoveEntry(index)}
							disabled={entries.length <= 1}
							className={cn(
								"mt-2 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors",
								entries.length > 1 ? "hover:text-destructive" : "cursor-not-allowed opacity-30",
							)}
						>
							<Trash weight="bold" className="size-4" />
						</button>
					</div>
				))}
			</div>

			{/* ステップ追加ボタン */}
			<button
				type="button"
				onClick={handleAddEntry}
				disabled={entries.length >= MAX_MILESTONES_PER_GOAL}
				className={cn(
					"flex items-center gap-1 text-sm text-primary hover:underline",
					entries.length >= MAX_MILESTONES_PER_GOAL &&
						"cursor-not-allowed opacity-50 hover:no-underline",
				)}
			>
				<Plus weight="bold" className="size-4" />
				ステップを追加
			</button>

			<div className="flex justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					<X weight="bold" className="mr-1 size-4" />
					キャンセル
				</Button>
				<Button type="submit" size="sm" disabled={isSaving || !isValid}>
					<Check weight="bold" className="mr-1 size-4" />
					保存
				</Button>
			</div>
		</form>
	);
}
