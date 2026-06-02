"use client";

import { cn } from "@/lib/utils";
import { Check, PencilSimple } from "@phosphor-icons/react";
import type { Milestone } from "../types";

type MilestoneProgressProps = {
	milestones: Milestone[];
	onEdit?: () => void;
	onToggleComplete?: (milestoneId: string) => void;
	className?: string;
};

export function MilestoneProgress({
	milestones,
	onEdit,
	onToggleComplete,
	className,
}: MilestoneProgressProps) {
	// マイルストーンをorder順にソート
	const sortedMilestones = [...milestones].sort(
		(a, b) => a.order - b.order,
	);

	const completedCount = sortedMilestones.filter((m) => m.isCompleted).length;
	const isCompact = sortedMilestones.length >= 6;

	if (sortedMilestones.length === 0) {
		return (
			<div
				className={cn(
					"flex items-center justify-between rounded-lg border border-dashed p-4",
					className,
				)}
			>
				<p className="text-sm text-muted-foreground">
					マイルストーンが設定されていません
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

	return (
		<div className={cn("space-y-3", className)}>
			{/* 進捗バー */}
			<div className="flex items-center justify-between">
				<p className="text-xs font-medium text-muted-foreground">
					マイルストーン進捗: {completedCount}/{sortedMilestones.length}
				</p>
				{onEdit && (
					<button
						type="button"
						onClick={onEdit}
						className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
					>
						<PencilSimple weight="bold" className="size-3.5" />
						編集
					</button>
				)}
			</div>

			{/* N段階ステップ表示 */}
			<div className="flex items-start">
				{sortedMilestones.map((milestone, index) => (
					<div key={milestone.id} className="flex flex-1 flex-col items-center">
						{/* ステップインジケーター */}
						<div className="flex w-full items-center">
							{/* 線（最初以外） */}
							{index > 0 && (
								<div
									className={cn(
										"h-0.5 flex-1",
										sortedMilestones[index - 1]?.isCompleted
											? "bg-primary"
											: "bg-muted",
									)}
								/>
							)}

							{/* 丸 */}
							<button
								type="button"
								onClick={() => onToggleComplete?.(milestone.id)}
								disabled={!onToggleComplete}
								className={cn(
									"flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
									isCompact ? "size-6" : "size-8",
									milestone.isCompleted
										? "border-primary bg-primary text-primary-foreground"
										: "border-muted-foreground/30 bg-background",
									onToggleComplete &&
										"cursor-pointer hover:border-primary/50",
								)}
							>
								{milestone.isCompleted ? (
									<Check weight="bold" className={isCompact ? "size-3" : "size-4"} />
								) : (
									<span className={cn(
										"font-medium text-muted-foreground",
										isCompact ? "text-[10px]" : "text-xs",
									)}>
										{index + 1}
									</span>
								)}
							</button>

							{/* 線（最後以外） */}
							{index < sortedMilestones.length - 1 && (
								<div
									className={cn(
										"h-0.5 flex-1",
										milestone.isCompleted ? "bg-primary" : "bg-muted",
									)}
								/>
							)}
						</div>

						{/* ラベル */}
						<div className="mt-2 text-center">
							<p className={cn(
								"font-medium text-muted-foreground",
								isCompact ? "text-[10px]" : "text-xs",
							)}>
								{milestone.label}
							</p>
							<p
								className={cn(
									"mt-0.5 line-clamp-2",
									isCompact ? "text-[10px]" : "text-xs",
									milestone.isCompleted
										? "text-primary"
										: "text-foreground",
								)}
							>
								{milestone.title}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
