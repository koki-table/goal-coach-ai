"use client";

import { buttonVariants } from "@/components/atom/button";
import { Label } from "@/components/atom/label";
import { Select } from "@/components/atom/select";
import { cn } from "@/lib/utils";
import Link from "next/link";

type GoalSelectorOption = {
	id: string;
	title: string;
};

type GoalSelectorProps = {
	goals: GoalSelectorOption[];
	selectedGoalId: string | undefined;
	onSelectGoal: (goalId: string) => void;
	isLoading?: boolean;
};

export function GoalSelector({
	goals,
	selectedGoalId,
	onSelectGoal,
	isLoading = false,
}: GoalSelectorProps) {
	if (!isLoading && goals.length === 0) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center">
				<p className="text-muted-foreground">
					評価する目標がありません。
					<br />
					先に目標を作成してください。
				</p>
				<Link href="/goals" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
					目標を作成する
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<Label htmlFor="coach-goal-select">評価する目標</Label>
			<Select
				id="coach-goal-select"
				value={selectedGoalId ?? ""}
				disabled={isLoading}
				onChange={(e) => onSelectGoal(e.target.value)}
			>
				<option value="" disabled>
					目標を選択してください
				</option>
				{goals.map((goal) => (
					<option key={goal.id} value={goal.id}>
						{goal.title}
					</option>
				))}
			</Select>
		</div>
	);
}
