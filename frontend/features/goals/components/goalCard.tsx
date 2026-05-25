"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/atom/card";
import { Badge } from "@/components/atom/badge";
import {
	Progress,
	ProgressLabel,
	ProgressValue,
} from "@/components/atom/progress";
import { cn } from "@/lib/utils";
import type { Goal } from "../types";
import { categoryLabels } from "../types";

type GoalCardProps = {
	goal: Goal;
	achievementProbability?: number;
	progressPercent?: number;
	onClick?: () => void;
	isSelected?: boolean;
};

export function GoalCard({
	goal,
	achievementProbability,
	progressPercent = 0,
	onClick,
	isSelected = false,
}: GoalCardProps) {
	// 期限までの残り日数を計算
	const daysRemaining = Math.ceil(
		(new Date(goal.deadline).getTime() - new Date().getTime()) /
			(1000 * 60 * 60 * 24),
	);

	// 達成確率に応じた色を返す
	const getProbabilityColor = (probability: number) => {
		if (probability >= 70) return "text-success";
		if (probability >= 40) return "text-warning";
		return "text-destructive";
	};

	return (
		<Card
			className={cn(
				"cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
				isSelected && "ring-2 ring-primary",
			)}
			onClick={onClick}
		>
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="space-y-1">
						<CardTitle className="line-clamp-1">{goal.title}</CardTitle>
						{goal.description && (
							<CardDescription className="line-clamp-2">
								{goal.description}
							</CardDescription>
						)}
					</div>
					<Badge variant="secondary">{categoryLabels[goal.category]}</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* 進捗バー */}
				<Progress value={progressPercent}>
					<ProgressLabel>進捗</ProgressLabel>
					<ProgressValue />
				</Progress>

				{/* 達成確率と期限 */}
				<div className="flex items-center justify-between text-sm">
					{achievementProbability !== undefined && (
						<div className="flex items-center gap-1.5">
							<span className="text-muted-foreground">達成確率:</span>
							<span
								className={cn(
									"font-semibold",
									getProbabilityColor(achievementProbability),
								)}
							>
								{achievementProbability}%
							</span>
						</div>
					)}
					<div className="flex items-center gap-1.5">
						<span className="text-muted-foreground">期限:</span>
						<span
							className={cn(
								"font-medium",
								daysRemaining <= 30 && "text-warning",
								daysRemaining <= 7 && "text-destructive",
							)}
						>
							{daysRemaining > 0 ? `残り${daysRemaining}日` : "期限切れ"}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
