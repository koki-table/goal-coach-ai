"use client";

import { Button } from "@/components/atom/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import { cn } from "@/lib/utils";
import { ArrowsClockwise, Lightning, Warning } from "@phosphor-icons/react";
import type { GoalStatus } from "../types";

type ProbabilityReviewProps = {
	status: GoalStatus;
	onRequestReview: () => Promise<void>;
	isLoading?: boolean;
};

export function ProbabilityReview({
	status,
	onRequestReview,
	isLoading = false,
}: ProbabilityReviewProps) {
	const { achievementProbability, coachFeedback, velocity } = status;

	// 確率に応じた色とスタイルを返す
	const getProbabilityStyle = (probability: number) => {
		if (probability >= 70) {
			return {
				bgColor: "bg-success/10",
				textColor: "text-success",
				borderColor: "border-success/30",
				label: "順調",
			};
		}
		if (probability >= 40) {
			return {
				bgColor: "bg-warning/10",
				textColor: "text-warning",
				borderColor: "border-warning/30",
				label: "要注意",
			};
		}
		return {
			bgColor: "bg-destructive/10",
			textColor: "text-destructive",
			borderColor: "border-destructive/30",
			label: "危険",
		};
	};

	const style = getProbabilityStyle(achievementProbability);

	return (
		<Card className={cn("border-2", style.borderColor)}>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Lightning weight="fill" className={cn("size-5", style.textColor)} />
						達成確率レビュー
					</CardTitle>
					<Button variant="outline" size="sm" onClick={onRequestReview} disabled={isLoading}>
						<ArrowsClockwise
							weight="bold"
							className={cn("mr-1 size-4", isLoading && "animate-spin")}
						/>
						{isLoading ? "分析中..." : "AI再レビュー"}
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* 達成確率メーター */}
				<div className={cn("rounded-lg p-4", style.bgColor)}>
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium text-muted-foreground">現在の達成確率</p>
							<div className="flex items-baseline gap-2">
								<span className={cn("text-4xl font-bold", style.textColor)}>
									{achievementProbability}%
								</span>
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
						<div className="text-right">
							<p className="text-sm text-muted-foreground">消化ベロシティ</p>
							<p className="text-lg font-semibold">{velocity} タスク/日</p>
						</div>
					</div>

					{/* プログレスバー（視覚的表現） */}
					<div className="mt-4">
						<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
							<div
								className={cn("h-full transition-all duration-500", {
									"bg-success": achievementProbability >= 70,
									"bg-warning": achievementProbability >= 40 && achievementProbability < 70,
									"bg-destructive": achievementProbability < 40,
								})}
								style={{ width: `${achievementProbability}%` }}
							/>
						</div>
						<div className="mt-1 flex justify-between text-xs text-muted-foreground">
							<span>0%</span>
							<span>50%</span>
							<span>100%</span>
						</div>
					</div>
				</div>

				{/* AIコーチフィードバック */}
				<div className="rounded-lg border bg-muted/30 p-4">
					<div className="mb-2 flex items-center gap-2">
						<Warning weight="fill" className="size-5 text-warning" />
						<h4 className="font-semibold">AIコーチからのフィードバック</h4>
					</div>
					<p className="text-sm leading-relaxed text-foreground/90">{coachFeedback}</p>
				</div>
			</CardContent>
		</Card>
	);
}
