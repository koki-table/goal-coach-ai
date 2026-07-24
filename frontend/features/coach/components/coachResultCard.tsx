"use client";

import { Button } from "@/components/atom/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import { cn } from "@/lib/utils";
import { CheckCircle, Lightning, Warning } from "@phosphor-icons/react";
import { useState } from "react";
import { getSuccessRateStyle } from "../helpers/successRateStyle.helper";

type CoachResultCardProps = {
	feedback: string;
	successRate: number;
	actionableSuggestions: string[];
	onAddSuggestion: (title: string) => Promise<void>;
};

export function CoachResultCard({
	feedback,
	successRate,
	actionableSuggestions,
	onAddSuggestion,
}: CoachResultCardProps) {
	const style = getSuccessRateStyle(successRate);
	const [addedIndexes, setAddedIndexes] = useState<Set<number>>(new Set());
	const [addingIndex, setAddingIndex] = useState<number | undefined>(undefined);

	const handleAdd = async (index: number, title: string) => {
		setAddingIndex(index);
		try {
			await onAddSuggestion(title);
			setAddedIndexes((prev) => new Set(prev).add(index));
		} finally {
			setAddingIndex(undefined);
		}
	};

	return (
		<Card className={cn("border-2", style.borderColor)}>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2">
					<Lightning weight="fill" className={cn("size-5", style.textColor)} />
					AIコーチからの評価
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className={cn("rounded-lg p-4", style.bgColor)}>
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium text-muted-foreground">成功率</p>
							<div className="flex items-baseline gap-2">
								<span className={cn("text-4xl font-bold", style.textColor)}>{successRate}%</span>
								<span
									className={cn(
										"rounded px-2 py-0.5 text-xs font-medium",
										style.bgColor,
										style.textColor,
									)}
								>
									{style.label}
								</span>
							</div>
						</div>
					</div>
					<div className="mt-4">
						<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
							<div
								className={cn("h-full transition-all duration-500", style.barColor)}
								style={{ width: `${successRate}%` }}
							/>
						</div>
					</div>
				</div>

				<div className="rounded-lg border bg-muted/30 p-4">
					<div className="mb-2 flex items-center gap-2">
						<Warning weight="fill" className="size-5 text-warning" />
						<h4 className="font-semibold">AIコーチからのフィードバック</h4>
					</div>
					<p className="text-sm leading-relaxed text-foreground/90">{feedback}</p>
				</div>

				{actionableSuggestions.length > 0 && (
					<div className="space-y-2">
						<h4 className="font-semibold">次にやるべきこと</h4>
						<ul className="space-y-2">
							{actionableSuggestions.map((suggestion, index) => {
								const isAdded = addedIndexes.has(index);
								return (
									<li
										key={suggestion}
										className="flex items-center justify-between gap-3 rounded-lg border p-3"
									>
										<span className="text-sm">{suggestion}</span>
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={isAdded || addingIndex === index}
											onClick={() => handleAdd(index, suggestion)}
										>
											{isAdded ? (
												<>
													<CheckCircle weight="fill" className="mr-1 size-4" />
													追加済み
												</>
											) : addingIndex === index ? (
												"追加中..."
											) : (
												"TODOに追加"
											)}
										</Button>
									</li>
								);
							})}
						</ul>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
