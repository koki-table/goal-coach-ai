"use client";

import { buttonVariants } from "@/components/atom/button";
import { Card, CardContent } from "@/components/atom/card";
import { Skeleton } from "@/components/atom/skeleton";
import { GoalStatusForm } from "@/features/goals/components/goalForm";
import { GoalList } from "@/features/goals/components/goalList";
import { ProbabilityReview } from "@/features/goals/components/probabilityReview";
import { calculateGoalProgress } from "@/features/goals/helpers/goalProgress.helper";
import { useGoalStatus } from "@/features/goals/hooks/useGoalStatus";
import { useGoals } from "@/features/goals/hooks/useGoals";
import type { GoalInput, GoalStatusInput } from "@/features/goals/schemas/goalSchema";
import { useAllMilestones } from "@/features/todos/hooks/useMilestones";
import { useTodos } from "@/features/todos/hooks/useTodos";
import { cn } from "@/lib/utils";
import { ListChecks } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function GoalsPage() {
	const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(undefined);

	// 目標一覧のフック
	const { data: goals, isLoading: goalsLoading, createGoal } = useGoals();
	const { goalsWithTodos } = useTodos();
	const { milestonesMap } = useAllMilestones();

	// 選択中の目標のステータスフック
	const {
		data: goalStatus,
		isLoading: statusLoading,
		updateStatus,
		requestAiReview,
	} = useGoalStatus(selectedGoalId ?? "");

	const handleCreateGoal = async (data: GoalInput) => {
		const newGoal = await createGoal(data);
		setSelectedGoalId(newGoal.id);
	};

	const handleUpdateStatus = async (data: GoalStatusInput) => {
		await updateStatus(data);
	};

	const handleRequestReview = async () => {
		await requestAiReview();
	};

	// 進捗率を実データから算出
	const progressMap = useMemo(() => {
		const map: Record<string, number> = {};
		for (const g of goalsWithTodos) {
			const totalTodos = g.aiGeneratedTodos.length + g.myTodos.length;
			const completedTodos = [...g.aiGeneratedTodos, ...g.myTodos].filter(
				(t) => t.completed,
			).length;
			const milestones = milestonesMap[g.goalId] ?? [];
			const totalMilestones = milestones.length;
			const completedMilestones = milestones.filter((m) => m.isCompleted).length;
			map[g.goalId] = calculateGoalProgress({
				totalTodos,
				completedTodos,
				totalMilestones,
				completedMilestones,
			});
		}
		return map;
	}, [goalsWithTodos, milestonesMap]);

	// ローディング中の表示
	if (goalsLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-48" />
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* 目標一覧 */}
			<GoalList
				goals={goals ?? []}
				selectedGoalId={selectedGoalId}
				onSelectGoal={setSelectedGoalId}
				onCreateGoal={handleCreateGoal}
				progressMap={progressMap}
			/>

			{/* 選択中の目標の詳細 */}
			{selectedGoalId && (
				<div className="space-y-6">
					<h2 className="text-xl font-semibold">選択中の目標</h2>

					{/* 達成確率レビュー */}
					{goalStatus && (
						<ProbabilityReview
							status={goalStatus}
							onRequestReview={handleRequestReview}
							isLoading={statusLoading}
						/>
					)}

					{/* 現状ステータス更新フォーム */}
					{goalStatus && (
						<GoalStatusForm
							initialData={{
								progressPercent: goalStatus.progressPercent,
								memo: goalStatus.memo,
								obstacles: goalStatus.obstacles,
							}}
							onSubmit={handleUpdateStatus}
							isLoading={statusLoading}
						/>
					)}

					{/* TODOタブへの誘導 */}
					<Card>
						<CardContent className="flex items-center justify-between py-6">
							<div className="flex items-center gap-3">
								<div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
									<ListChecks weight="fill" className="size-5 text-primary" />
								</div>
								<div>
									<p className="font-medium">タスク管理</p>
									<p className="text-sm text-muted-foreground">
										目標ごとのTODOとマイルストーンを管理
									</p>
								</div>
							</div>
							<Link href="/todos" className={cn(buttonVariants())}>
								TODOを管理する
							</Link>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
