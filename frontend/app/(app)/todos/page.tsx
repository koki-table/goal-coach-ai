"use client";

import { Skeleton } from "@/components/atom/skeleton";
import { TodoEditSheet } from "@/features/todos/components/todoEditSheet";
import { TodoGroupByGoal } from "@/features/todos/components/todoGroupByGoal";
import { useAllMilestones } from "@/features/todos/hooks/useMilestones";
import { useTodos } from "@/features/todos/hooks/useTodos";
import type {
	MilestoneEntry,
	TodoInput,
	TodoUpdateInput,
} from "@/features/todos/schemas/todoSchema";
import type { Todo } from "@/features/todos/types";
import { createApiClient } from "@/lib/swr/apiClient";
import { revalidateByPrefix } from "@/lib/swr/mutate";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useState } from "react";

export default function TodosPage() {
	const { getToken } = useAuth();
	const apiClient = createApiClient(getToken);

	const {
		goalsWithTodos,
		isLoading: todosLoading,
		toggleTodoComplete,
		deleteTodo,
		addTodo,
		updateTodo,
		reorderTodos,
	} = useTodos();

	const { milestonesMap, isLoading: milestonesLoading } = useAllMilestones();

	// 編集中のTodo状態
	const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

	// 新規追加対象のゴールID
	const [addingGoalId, setAddingGoalId] = useState<string | null>(null);

	// 目標ごとのTODOグループを構築（マイルストーンを含む）
	const groups = goalsWithTodos.map((g) => ({
		goalId: g.goalId,
		goalTitle: g.goalTitle,
		milestones: milestonesMap[g.goalId] ?? [],
		myTodos: g.myTodos,
	}));

	// 編集中のTodoが属するゴールのマイルストーン
	const editingMilestones = editingTodo ? (milestonesMap[editingTodo.goalId] ?? []) : [];

	// 新規追加対象のゴールのマイルストーン
	const addingMilestones = addingGoalId ? (milestonesMap[addingGoalId] ?? []) : [];

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

	const handleAddTodo = useCallback((goalId: string) => {
		setAddingGoalId(goalId);
	}, []);

	const handleCreateTodo = useCallback(
		(goalId: string, input: TodoInput) => {
			addTodo(goalId, input, false);
			setAddingGoalId(null);
		},
		[addTodo],
	);

	const handleEditTodo = useCallback((todo: Todo) => {
		setEditingTodo(todo);
	}, []);

	const handleSaveEdit = useCallback(
		(todoId: string, input: TodoUpdateInput) => {
			updateTodo(todoId, input);
		},
		[updateTodo],
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
				onEditTodo={handleEditTodo}
				onReorderTodos={handleReorderTodos}
				onToggleMilestoneComplete={handleToggleMilestoneComplete}
				onSaveMilestones={handleSaveMilestones}
			/>

			{/* 編集用Sheet */}
			<TodoEditSheet
				mode="edit"
				todo={editingTodo}
				milestones={editingMilestones}
				isOpen={editingTodo !== null}
				onClose={() => setEditingTodo(null)}
				onSave={handleSaveEdit}
			/>

			{/* 新規作成用Sheet */}
			{addingGoalId && (
				<TodoEditSheet
					mode="create"
					goalId={addingGoalId}
					milestones={addingMilestones}
					isOpen={addingGoalId !== null}
					onClose={() => setAddingGoalId(null)}
					onCreate={handleCreateTodo}
				/>
			)}
		</div>
	);
}
