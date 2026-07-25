"use client";

import { buttonVariants } from "@/components/atom/button";
import { Select } from "@/components/atom/select";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { MOBILE_BREAKPOINT_PX } from "../config/coachConfig";

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
	// スマホ（md未満）では縦一覧ではなくドロップダウンで目標を選択する
	const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);

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

	if (isMobile) {
		return (
			<Select
				aria-label="目標一覧"
				value={selectedGoalId ?? ""}
				disabled={isLoading}
				onChange={(e) => onSelectGoal(e.target.value)}
				className="h-12"
				style={{ fontSize: "1.125rem" }}
			>
				<option value="" disabled style={{ fontSize: "1.125rem" }}>
					目標を選択してください
				</option>
				{goals.map((goal) => (
					<option key={goal.id} value={goal.id} style={{ fontSize: "1.125rem" }}>
						{goal.title}
					</option>
				))}
			</Select>
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
