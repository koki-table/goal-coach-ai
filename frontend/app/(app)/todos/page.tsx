"use client";

import { Skeleton } from "@/components/atom/skeleton";
import { TodoGroupByGoal } from "@/features/todos/components/todoGroupByGoal";
import { useAllMilestones } from "@/features/todos/hooks/useMilestones";
import { useTodos } from "@/features/todos/hooks/useTodos";
import type { MilestoneEntry, TodoInput } from "@/features/todos/schemas/todoSchema";
import { createApiClient } from "@/lib/swr/apiClient";
import { revalidateByPrefix } from "@/lib/swr/mutate";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

export default function TodosPage() {
	const { getToken } = useAuth();
	const apiClient = createApiClient(getToken);

	const {
		goalsWithTodos,
		isLoading: todosLoading,
		toggleTodoComplete,
		deleteTodo,
		addTodo,
		reorderTodos,
	} = useTodos();

	const { milestonesMap, isLoading: milestonesLoading } = useAllMilestones();

	// 目標ごとのTODOグループを構築（マイルストーンを含む）
	const groups = goalsWithTodos.map((g) => ({
		goalId: g.goalId,
		goalTitle: g.goalTitle,
		milestones: milestonesMap[g.goalId] ?? [],
		myTodos: g.myTodos,
	}));

	// ハンドラー
	const handleToggleComplete = useCallback(
		(todoId: string) => {
			toggleTodoComplete(todoId);
		},
		[toggleTodoComplete],
	);

	const handleDeleteTodo = useCallback(
		(todoId: string) => {
			deleteTodo(todoId);
		},
		[deleteTodo],
	);

	const handleAddTodo = useCallback(
		(goalId: string, input: TodoInput) => {
			addTodo(goalId, input, false);
		},
		[addTodo],
	);

	const handleReorderTodos = useCallback(
		(
			sourceList: "aiTodos" | "myTodos",
			sourceIndex: number,
			destinationList: "aiTodos" | "myTodos",
			destinationIndex: number,
			goalId: string,
		) => {
			reorderTodos(sourceList, sourceIndex, destinationList, destinationIndex, goalId);
		},
		[reorderTodos],
	);

	const handleToggleMilestoneComplete = useCallback(
		async (_goalId: string, milestoneId: string) => {
			const milestones = milestonesMap[_goalId] ?? [];
			const current = milestones.find((m) => m.id === milestoneId);
			if (!current) return;

			await apiClient.patch(`/milestones/${milestoneId}`, {
				isCompleted: !current.isCompleted,
			});
			await revalidateByPrefix("/milestones");
		},
		[apiClient, milestonesMap],
	);

	const handleSaveMilestones = useCallback(
		async (goalId: string, entries: MilestoneEntry[]) => {
			const payload = entries.map((entry, idx) => ({
				title: entry.title,
				label: entry.label,
				order: idx + 1,
			}));
			await apiClient.put(`/goals/${goalId}/milestones`, payload);
			await revalidateByPrefix("/milestones");
		},
		[apiClient],
	);

	const isLoading = todosLoading || milestonesLoading;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">TODO</h2>
					<p className="text-muted-foreground">目標ごとのタスクを管理します</p>
				</div>
				<div className="space-y-4">
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">TODO</h2>
				<p className="text-muted-foreground">
					目標ごとのタスクを管理します。TODOを完了すると達成回数がカウントされます。
				</p>
			</div>

			<TodoGroupByGoal
				groups={groups}
				onToggleComplete={handleToggleComplete}
				onDeleteTodo={handleDeleteTodo}
				onAddTodo={handleAddTodo}
				onReorderTodos={handleReorderTodos}
				onToggleMilestoneComplete={handleToggleMilestoneComplete}
				onSaveMilestones={handleSaveMilestones}
			/>
		</div>
	);
}
