"use client";

import { Select } from "@/components/atom/select";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { Compass } from "@phosphor-icons/react";
import { EXPLORATION_THREAD_LABEL, MOBILE_BREAKPOINT_PX } from "../config/coachConfig";
import type { ThreadTarget } from "../helpers/coachThreadTarget.helper";

const EXPLORATION_VALUE = "__exploration__";

type GoalThreadOption = {
	id: string;
	title: string;
};

type GoalThreadListProps = {
	goals: GoalThreadOption[];
	selectedThread: ThreadTarget;
	onSelectGoal: (goalId: string) => void;
	onSelectExploration: () => void;
	isLoading?: boolean;
};

export function GoalThreadList({
	goals,
	selectedThread,
	onSelectGoal,
	onSelectExploration,
	isLoading = false,
}: GoalThreadListProps) {
	// スマホ（md未満）では縦一覧ではなくドロップダウンで目標を選択する
	const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
	const selectedGoalId = selectedThread?.kind === "goal" ? selectedThread.goalId : undefined;
	const isExplorationSelected = selectedThread?.kind === "exploration";

	if (isMobile) {
		return (
			<Select
				aria-label="目標一覧"
				value={isExplorationSelected ? EXPLORATION_VALUE : (selectedGoalId ?? "")}
				disabled={isLoading}
				onChange={(e) => {
					if (e.target.value === EXPLORATION_VALUE) {
						onSelectExploration();
					} else {
						onSelectGoal(e.target.value);
					}
				}}
				className="h-12"
			>
				<option value="" disabled style={{ fontSize: "1.125rem" }}>
					目標を選択してください
				</option>
				<option value={EXPLORATION_VALUE} style={{ fontSize: "1.125rem" }}>
					{EXPLORATION_THREAD_LABEL}
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
			<button
				type="button"
				disabled={isLoading}
				onClick={onSelectExploration}
				className={cn(
					"flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
					isExplorationSelected
						? "bg-primary/10 font-medium text-primary"
						: "text-secondary-foreground hover:bg-muted",
				)}
			>
				<Compass className="size-4 shrink-0" aria-hidden="true" />
				{EXPLORATION_THREAD_LABEL}
			</button>
			<div className="border-b border-border pb-1" />
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
