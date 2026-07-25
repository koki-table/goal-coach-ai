"use client";

import { Skeleton } from "@/components/atom/skeleton";
import { TodoEditModal } from "@/features/todos/components/todoEditModal";
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
import { useMediaQuery } from "@/hooks/useMediaQuery";
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

	// PC（md以上）はModal、モバイルはSheetで編集する
	const isDesktop = useMediaQuery("(min-width: 768px)");

	// 編集中のTodo状態
	const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

	// 新規追加対象のゴールID
	const [addingGoalId, setAddingGoalId] = useState<string | null>(null);

	// 目標ごとのTODOグループを構築（マイルストーンを含む）。
	// AIコーチ経由で採用されたTODOはisAiGenerated:trueでaiGeneratedTodos側に分類されるため、
	// 表示上はmyTodosと結合して単一のリストとして扱う（ボード自体にAI/自分の区分UIは無い）。
	const groups = goalsWithTodos.map((g) => ({
		goalId: g.goalId,
		goalTitle: g.goalTitle,
		milestones: milestonesMap[g.goalId] ?? [],
		myTodos: [...g.aiGeneratedTodos, ...g.myTodos],
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
		async (goalId: string, entries: MilestoneEntry[]): Promise<boolean> => {
			// 送信entriesに含まれない既存マイルストーンは削除される（サーバ側の差分同期）。
			// 削除対象に紐づくTODOがあれば、紐付けが解除される旨を確認する。
			const goal = goalsWithTodos.find((g) => g.goalId === goalId);
			const keptIds = new Set(entries.map((e) => e.id).filter(Boolean));
			const existingMilestones = milestonesMap[goalId] ?? [];
			const deletedIds = new Set(
				existingMilestones.filter((m) => !keptIds.has(m.id)).map((m) => m.id),
			);
			const hasLinkedTodos = [...(goal?.aiGeneratedTodos ?? []), ...(goal?.myTodos ?? [])].some(
				(t) => t.milestoneId && deletedIds.has(t.milestoneId),
			);
			if (
				hasLinkedTodos &&
				!window.confirm(
					"削除するマイルストーンに紐付いたTODOがあります。紐付けは解除されますが、TODO自体は削除されません。よろしいですか？",
				)
			) {
				return false;
			}

			const payload = entries.map((entry, idx) => ({
				id: entry.id,
				title: entry.title,
				label: entry.label,
				order: idx + 1,
				isCompleted: entry.isCompleted,
			}));
			await apiClient.put(`/goals/${goalId}/milestones`, payload);
			await revalidateByPrefix("/milestones");
			// 削除されたマイルストーンに紐づくtodoはサーバでmilestoneIdが解除されるため再検証する
			if (deletedIds.size > 0) {
				await revalidateByPrefix("/todos");
			}
			return true;
		},
		[apiClient, goalsWithTodos, milestonesMap],
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

			{/* 編集用（PC=Modal / モバイル=Sheet） */}
			{isDesktop ? (
				<TodoEditModal
					mode="edit"
					todo={editingTodo}
					milestones={editingMilestones}
					isOpen={editingTodo !== null}
					onClose={() => setEditingTodo(null)}
					onSave={handleSaveEdit}
				/>
			) : (
				<TodoEditSheet
					mode="edit"
					todo={editingTodo}
					milestones={editingMilestones}
					isOpen={editingTodo !== null}
					onClose={() => setEditingTodo(null)}
					onSave={handleSaveEdit}
				/>
			)}

			{/* 新規作成用（PC=Modal / モバイル=Sheet） */}
			{addingGoalId &&
				(isDesktop ? (
					<TodoEditModal
						mode="create"
						goalId={addingGoalId}
						milestones={addingMilestones}
						isOpen={addingGoalId !== null}
						onClose={() => setAddingGoalId(null)}
						onCreate={handleCreateTodo}
					/>
				) : (
					<TodoEditSheet
						mode="create"
						goalId={addingGoalId}
						milestones={addingMilestones}
						isOpen={addingGoalId !== null}
						onClose={() => setAddingGoalId(null)}
						onCreate={handleCreateTodo}
					/>
				))}
		</div>
	);
}
