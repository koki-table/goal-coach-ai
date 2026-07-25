"use client";

import { buttonVariants } from "@/components/atom/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

type GoalThreadOption = {
	id: string;
	title: string;
};

type GoalThreadListProps = {
	goals: GoalThreadOption[];
	selectedGoalId: string | undefined;
	onSelectGoal: (goalId: string) => void;
	isLoading?: boolean;
};

export function GoalThreadList({
	goals,
	selectedGoalId,
	onSelectGoal,
	isLoading = false,
}: GoalThreadListProps) {
	if (!isLoading && goals.length === 0) {
		return (
			<div className="rounded-lg border border-dashed p-6 text-center text-sm">
				<p className="text-muted-foreground">
					相談できる目標がありません。
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
		<nav className="space-y-1" aria-label="目標一覧">
			{goals.map((goal) => (
				<button
					key={goal.id}
					type="button"
					disabled={isLoading}
					onClick={() => onSelectGoal(goal.id)}
					className={cn(
						"w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
						goal.id === selectedGoalId
							? "bg-primary/10 font-medium text-primary"
							: "text-foreground hover:bg-muted",
					)}
				>
					{goal.title}
				</button>
			))}
		</nav>
	);
}
