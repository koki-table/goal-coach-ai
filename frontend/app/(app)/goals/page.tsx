"use client";

import { useState } from "react";
import { GoalList } from "@/features/goals/components/goalList";
import { GoalStatusForm } from "@/features/goals/components/goalForm";
import { ProbabilityReview } from "@/features/goals/components/probabilityReview";
import { useGoals } from "@/features/goals/hooks/useGoals";
import { useGoalStatus } from "@/features/goals/hooks/useGoalStatus";
import type { GoalInput, GoalStatusInput } from "@/features/goals/schemas/goalSchema";
import { Skeleton } from "@/components/atom/skeleton";
import { Card, CardContent } from "@/components/atom/card";
import { buttonVariants } from "@/components/atom/button";
import { ListChecks } from "@phosphor-icons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function GoalsPage() {
	const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(
		"goal-1",
	);

	// 目標一覧のフック
	const { data: goals, isLoading: goalsLoading, createGoal } = useGoals();

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

	// 達成確率・進捗率のマッピング（モック: 実際はAPIから取得）
	const probabilityMap: Record<string, number> = {
		"goal-1": goalStatus?.achievementProbability ?? 32,
		"goal-2": 58,
		"goal-3": 75,
	};

	const progressMap: Record<string, number> = {
		"goal-1": goalStatus?.progressPercent ?? 28,
		"goal-2": 45,
		"goal-3": 62,
	};

	return (
		<div className="space-y-8">
			{/* 目標一覧 */}
			<GoalList
				goals={goals ?? []}
				selectedGoalId={selectedGoalId}
				onSelectGoal={setSelectedGoalId}
				onCreateGoal={handleCreateGoal}
				probabilityMap={probabilityMap}
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
