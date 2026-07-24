"use client";

import { Badge } from "@/components/atom/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import { cn } from "@/lib/utils";
import { CaretDown, ClockCounterClockwise } from "@phosphor-icons/react";
import { useState } from "react";
import { getSuccessRateStyle } from "../helpers/successRateStyle.helper";
import type { CoachEvaluationHistoryItem } from "../types";

type CoachEvaluationHistoryPanelProps = {
	history: CoachEvaluationHistoryItem[];
	isLoading: boolean;
};

export function CoachEvaluationHistoryPanel({
	history,
	isLoading,
}: CoachEvaluationHistoryPanelProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Card>
			<CardHeader className="pb-2">
				<button
					type="button"
					onClick={() => setIsOpen((prev) => !prev)}
					aria-expanded={isOpen}
					className="flex w-full items-center justify-between gap-2 text-left"
				>
					<CardTitle className="flex items-center gap-2">
						<ClockCounterClockwise weight="fill" className="size-5 text-muted-foreground" />
						評価履歴
					</CardTitle>
					<CaretDown
						weight="bold"
						className={cn(
							"size-5 shrink-0 text-muted-foreground transition-transform",
							isOpen ? "" : "-rotate-90",
						)}
					/>
				</button>
			</CardHeader>

			{isOpen && (
				<CardContent className="space-y-3">
					{isLoading ? (
						<p className="text-sm text-muted-foreground">読み込み中...</p>
					) : history.length === 0 ? (
						<p className="text-sm text-muted-foreground">まだ評価履歴がありません</p>
					) : (
						<ul className="space-y-3">
							{history.map((item) => {
								const style = getSuccessRateStyle(item.successRate);
								return (
									<li key={item.id} className="rounded-lg border p-3">
										<div className="flex items-center justify-between gap-2">
											<span className="text-xs text-muted-foreground">
												{new Date(item.createdAt).toLocaleString("ja-JP")}
											</span>
											<Badge className={cn(style.bgColor, style.textColor)}>
												成功率 {item.successRate}%
											</Badge>
										</div>
										<p className="mt-2 text-sm text-foreground/90">{item.feedback}</p>
									</li>
								);
							})}
						</ul>
					)}
				</CardContent>
			)}
		</Card>
	);
}
