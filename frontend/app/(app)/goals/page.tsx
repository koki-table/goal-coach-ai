"use client";

import { useState } from "react";
import { GoalList } from "@/features/goals/components/goalList";
import { GoalStatusForm } from "@/features/goals/components/goalForm";
import { TaskBoard } from "@/features/goals/components/taskBoard";
import { ProbabilityReview } from "@/features/goals/components/probabilityReview";
import { useGoals } from "@/features/goals/hooks/useGoals";
import { useGoalStatus } from "@/features/goals/hooks/useGoalStatus";
import type { GoalInput, GoalStatusInput } from "@/features/goals/schemas/goalSchema";
import { Skeleton } from "@/components/atom/skeleton";

export default function GoalsPage() {
	const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(
		"goal-1",
	);

	// 目標一覧のフック
	const { data: goals, isLoading: goalsLoading, createGoal } = useGoals();

	// 選択中の目標のステータスフック
	const {
		data: goalStatus,
		taskBoard,
		isLoading: statusLoading,
		updateStatus,
		moveTaskToMyTodos,
		moveTaskToAiGenerated,
		toggleTaskComplete,
		addTask,
		deleteTask,
		requestAiReview,
		reorderTasks,
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

					{/* タスクボード */}
					{taskBoard && (
						<div className="space-y-4">
							<h3 className="text-lg font-semibold">
								可変ロードマップ & ToDo管理
							</h3>
							<TaskBoard
								taskBoard={taskBoard}
								onMoveToMyTodos={moveTaskToMyTodos}
								onMoveToAiGenerated={moveTaskToAiGenerated}
								onToggleComplete={toggleTaskComplete}
								onAddTask={addTask}
								onDeleteTask={deleteTask}
								onReorder={reorderTasks}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
