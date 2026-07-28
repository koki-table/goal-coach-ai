"use client";

import { Button } from "@/components/atom/button";
import { Input } from "@/components/atom/input";
import { cn } from "@/lib/utils";
import { Check, Plus, Trash, X } from "@phosphor-icons/react";
import { useState } from "react";
import {
	DEFAULT_CURRENT_VALUE,
	DEFAULT_START_VALUE,
	DEFAULT_TARGET_VALUE,
	DEFAULT_UNIT,
	UNIT_SUGGESTIONS,
} from "../config/milestoneConfig";
import { milestonesToFormEntries } from "../helpers/milestone.helper";
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
	// 既存のマイルストーンからフォームデータを初期化（測定値は保持して往復させる）
	const [entries, setEntries] = useState<MilestoneEntry[]>(() =>
		milestonesToFormEntries(milestones),
	);
	const [isSaving, setIsSaving] = useState(false);

	const handleEntryChange = (
		index: number,
		field: keyof MilestoneEntry,
		value: string | number,
	) => {
		setEntries((prev) =>
			prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
		);
	};

	const handleTargetChange = (index: number, raw: string) => {
		const parsed = Number(raw);
		handleEntryChange(index, "targetValue", Number.isFinite(parsed) ? parsed : 0);
	};

	const handleAddEntry = () => {
		if (entries.length >= MAX_MILESTONES_PER_GOAL) return;
		setEntries((prev) => [
			...prev,
			{
				label: "",
				title: "",
				targetValue: DEFAULT_TARGET_VALUE,
				unit: DEFAULT_UNIT,
				currentValue: DEFAULT_CURRENT_VALUE,
				startValue: DEFAULT_START_VALUE,
			},
		]);
	};

	const handleRemoveEntry = (index: number) => {
		if (entries.length <= 1) return;
		setEntries((prev) => prev.filter((_, i) => i !== index));
	};

	const isValid = entries.every((entry) => entry.label && entry.title && entry.targetValue > 0);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isValid) return;

		setIsSaving(true);
		try {
			await onSave(entries);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
			{/* OKRの「KR（Key Results）」の考え方をユーザーに補足する */}
			<p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
				主要な成果（Key Results）は、目標の達成度を測る<strong>定量的で測定可能な指標</strong>
				です。目標値と単位を決め（例: 900
				点）、達成できるか少し背伸びが必要なストレッチな水準で1つの目標につき2〜3個設定しましょう。進捗は現在値の「＋更新」で記録します。
			</p>
			<div className="space-y-3">
				{entries.map((entry, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: 新規行はidを持たず、順序が表示順を兼ねるため
					<div key={index} className="space-y-2 rounded-lg border border-border p-3">
						<div className="flex items-start gap-2">
							{/* ラベル入力 */}
							<Input
								value={entry.label}
								onChange={(e) => handleEntryChange(index, "label", e.target.value)}
								placeholder="ラベル（例: 学習成果）"
								className="w-28 shrink-0 text-sm"
								maxLength={30}
							/>

							{/* タイトル入力 */}
							<Input
								value={entry.title}
								onChange={(e) => handleEntryChange(index, "title", e.target.value)}
								placeholder="例: 模試で900点を取る"
								className="flex-1 text-sm"
								maxLength={100}
							/>

							{/* 削除ボタン */}
							<button
								type="button"
								onClick={() => handleRemoveEntry(index)}
								disabled={entries.length <= 1}
								aria-label="この主要な成果を削除"
								className={cn(
									"mt-2 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors",
									entries.length > 1 ? "hover:text-destructive" : "cursor-not-allowed opacity-30",
								)}
							>
								<Trash weight="bold" className="size-4" />
							</button>
						</div>

						{/* 目標値・単位（現在値は編集フォームでは変更せず＋更新で記録する） */}
						<div className="flex items-center gap-2 pl-1">
							<span className="text-xs text-muted-foreground">目標</span>
							<Input
								type="number"
								value={entry.targetValue}
								onChange={(e) => handleTargetChange(index, e.target.value)}
								min={0}
								step={1}
								className="w-24 text-sm"
								aria-label="目標値"
							/>
							<Input
								value={entry.unit}
								onChange={(e) => handleEntryChange(index, "unit", e.target.value)}
								placeholder="単位（例: 点）"
								className="w-28 text-sm"
								maxLength={10}
								aria-label="単位"
							/>
						</div>

						{/* 単位のクイック選択（自由入力も可） */}
						<div className="flex flex-wrap gap-1 pl-1">
							{UNIT_SUGGESTIONS.map((unit) => (
								<button
									key={unit}
									type="button"
									onClick={() => handleEntryChange(index, "unit", unit)}
									className={cn(
										"rounded-md border px-2 py-0.5 text-xs transition-colors",
										entry.unit === unit
											? "border-primary bg-primary/5 text-primary"
											: "border-border text-muted-foreground hover:bg-muted",
									)}
								>
									{unit}
								</button>
							))}
						</div>
					</div>
				))}
			</div>

			{/* KR追加ボタン */}
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
				主要な成果を追加
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
