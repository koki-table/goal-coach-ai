"use client";

import { Input } from "@/components/atom/input";
import { cn } from "@/lib/utils";
import { Check, PencilSimple, Plus, X } from "@phosphor-icons/react";
import { useState } from "react";
import {
	computeKrProgress,
	computeOverallProgress,
	isKrCompleted,
} from "../helpers/milestone.helper";
import type { Milestone } from "../types";

type MilestoneProgressProps = {
	milestones: Milestone[];
	onEdit?: () => void;
	// 現在値の手動更新（＋更新）。完了状態はサーバがcurrent>=targetから再計算する。
	onUpdateProgress?: (milestoneId: string, currentValue: number) => void;
	className?: string;
};

// 不要な小数を出さずに測定値を表示する（100.0 → "100"、80.5 → "80.5"）
function formatValue(value: number): string {
	return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export function MilestoneProgress({
	milestones,
	onEdit,
	onUpdateProgress,
	className,
}: MilestoneProgressProps) {
	const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);

	// ＋更新のインライン編集は表示専用のローカルUI状態（データフックではないため許容）
	const [editingId, setEditingId] = useState<string | null>(null);
	const [inputValue, setInputValue] = useState("");

	if (sortedMilestones.length === 0) {
		return (
			<div
				className={cn(
					"flex items-center justify-between rounded-lg border border-dashed p-4",
					className,
				)}
			>
				<p className="text-sm text-muted-foreground">
					主要な成果（Key Results）が設定されていません
				</p>
				{onEdit && (
					<button
						type="button"
						onClick={onEdit}
						className="flex items-center gap-1 text-sm text-primary hover:underline"
					>
						<PencilSimple weight="bold" className="size-4" />
						設定する
					</button>
				)}
			</div>
		);
	}

	const overallProgress = computeOverallProgress(sortedMilestones);

	const startEditing = (milestone: Milestone) => {
		setEditingId(milestone.id);
		setInputValue(String(milestone.currentValue));
	};

	const cancelEditing = () => {
		setEditingId(null);
		setInputValue("");
	};

	const submitEditing = (milestone: Milestone) => {
		const parsed = Number(inputValue);
		if (!Number.isFinite(parsed) || parsed < 0) return;
		// 現在値は [0, 目標値] にクランプ（目標超過・負値を防ぐ）
		const clamped = Math.min(Math.max(parsed, 0), milestone.targetValue);
		onUpdateProgress?.(milestone.id, clamped);
		setEditingId(null);
		setInputValue("");
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* 全体進捗（各KRの進捗率の平均） */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-medium text-muted-foreground">全体進捗</span>
					<span className="text-xs font-semibold tabular-nums text-foreground">
						{overallProgress}%
					</span>
				</div>
				<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
					<div
						className="h-full rounded-full bg-primary transition-all"
						style={{ width: `${overallProgress}%` }}
					/>
				</div>
			</div>

			{/* KR一覧（並列の測定指標。各KRに進捗バー＋現在値/目標値） */}
			<ul className="space-y-2.5">
				{sortedMilestones.map((milestone) => {
					const progress = computeKrProgress(milestone);
					const completed = isKrCompleted(milestone);
					const isEditing = editingId === milestone.id;

					return (
						<li
							key={milestone.id}
							className={cn(
								"rounded-lg border p-3",
								completed ? "border-primary bg-primary/5" : "border-border bg-background",
							)}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 space-y-1">
									{milestone.label && (
										<span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
											{milestone.label}
										</span>
									)}
									<p
										className={cn(
											"text-sm font-medium leading-snug",
											completed ? "text-primary" : "text-foreground",
										)}
									>
										{milestone.title}
									</p>
								</div>
								<div className="flex shrink-0 items-center gap-1">
									{completed && <Check weight="bold" className="size-4 text-primary" />}
									<span className="text-sm font-semibold tabular-nums text-foreground">
										{progress}%
									</span>
								</div>
							</div>

							{/* 進捗バー */}
							<div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary transition-all"
									style={{ width: `${progress}%` }}
								/>
							</div>

							{/* 現在値 / 目標値 と ＋更新 */}
							<div className="mt-2 flex items-center justify-between gap-2">
								<span className="text-xs tabular-nums text-muted-foreground">
									{formatValue(milestone.currentValue)} / {formatValue(milestone.targetValue)}
									{milestone.unit && <span className="ml-0.5">{milestone.unit}</span>}
								</span>

								{onUpdateProgress &&
									(isEditing ? (
										<div className="flex items-center gap-1">
											<Input
												type="number"
												value={inputValue}
												onChange={(e) => setInputValue(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") submitEditing(milestone);
													if (e.key === "Escape") cancelEditing();
												}}
												min={0}
												max={milestone.targetValue}
												step={1}
												autoFocus
												className="h-7 w-20 text-sm"
												aria-label="現在値"
											/>
											<button
												type="button"
												onClick={() => submitEditing(milestone)}
												aria-label="保存"
												className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
											>
												<Check weight="bold" className="size-4" />
											</button>
											<button
												type="button"
												onClick={cancelEditing}
												aria-label="キャンセル"
												className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
											>
												<X weight="bold" className="size-4" />
											</button>
										</div>
									) : (
										<button
											type="button"
											onClick={() => startEditing(milestone)}
											className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-muted"
										>
											<Plus weight="bold" className="size-3" />
											更新
										</button>
									))}
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
