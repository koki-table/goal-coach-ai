import { createApiClient } from "@/lib/swr/apiClient";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import useSWR from "swr";
import type { TodoInput, TodoUpdateInput } from "../schemas/todoSchema";
import type { GoalWithTodos, Todo } from "../types";

type UseTodosReturn = {
	todos: Todo[];
	aiTodos: Todo[];
	myTodos: Todo[];
	goalsWithTodos: GoalWithTodos[];
	isLoading: boolean;
	error: Error | undefined;
	toggleTodoComplete: (todoId: string) => Promise<void>;
	addTodo: (goalId: string, input: TodoInput, isAiGenerated?: boolean) => Promise<Todo>;
	updateTodo: (todoId: string, input: TodoUpdateInput) => Promise<void>;
	deleteTodo: (todoId: string) => Promise<void>;
	reorderTodos: (
		sourceList: "aiTodos" | "myTodos",
		sourceIndex: number,
		destinationList: "aiTodos" | "myTodos",
		destinationIndex: number,
		goalId: string,
	) => Promise<void>;
};

export function useTodos(): UseTodosReturn {
	const { getToken, isLoaded, isSignedIn } = useAuth();
	const apiClient = createApiClient(getToken);

	const { data, error, isLoading, mutate } = useSWR<GoalWithTodos[]>(
		isLoaded && isSignedIn ? "/todos" : null,
	);

	const goalsWithTodos = data ?? [];
	const aiTodos = goalsWithTodos.flatMap((g) => g.aiGeneratedTodos);
	const myTodos = goalsWithTodos.flatMap((g) => g.myTodos);
	const todos = [...aiTodos, ...myTodos];

	const toggleTodoComplete = useCallback(
		async (todoId: string): Promise<void> => {
			await apiClient.patch(`/todos/${todoId}/toggle`);
			await mutate();
		},
		[apiClient, mutate],
	);

	const addTodo = useCallback(
		async (goalId: string, input: TodoInput, isAiGenerated = false): Promise<Todo> => {
			const newTodo = await apiClient.post<Todo>(`/goals/${goalId}/todos`, {
				...input,
				isAiGenerated,
			});
			await mutate();
			return newTodo;
		},
		[apiClient, mutate],
	);

	const updateTodo = useCallback(
		async (todoId: string, input: TodoUpdateInput): Promise<void> => {
			await apiClient.patch(`/todos/${todoId}`, input);
			await mutate();
		},
		[apiClient, mutate],
	);

	const deleteTodo = useCallback(
		async (todoId: string): Promise<void> => {
			await apiClient.del(`/todos/${todoId}`);
			await mutate();
		},
		[apiClient, mutate],
	);

	const reorderTodos = useCallback(
		async (
			_sourceList: "aiTodos" | "myTodos",
			sourceIndex: number,
			_destinationList: "aiTodos" | "myTodos",
			destinationIndex: number,
			goalId: string,
		): Promise<void> => {
			// 画面上はaiGeneratedTodos+myTodosを結合した単一リストとして表示しているため、
			// 並び替えも結合リストに対して行う（sourceList/destinationList引数は使わない）。
			const currentData = data ? [...data] : [];
			const goalGroup = currentData.find((g) => g.goalId === goalId);
			if (!goalGroup) return;

			const combined = [...goalGroup.aiGeneratedTodos, ...goalGroup.myTodos];
			const [movedTodo] = combined.splice(sourceIndex, 1);
			if (!movedTodo) return;
			combined.splice(destinationIndex, 0, movedTodo);

			const updatedGroup: GoalWithTodos = {
				...goalGroup,
				aiGeneratedTodos: combined.filter((t) => t.isAiGenerated),
				myTodos: combined.filter((t) => !t.isAiGenerated),
			};
			const optimistic = currentData.map((g) => (g.goalId === goalId ? updatedGroup : g));
			mutate(optimistic, false);

			// API にリオーダーを送信（楽観更新後の並びを永続化する）
			const entries = combined.map((t, idx) => ({
				id: t.id,
				sortOrder: idx + 1,
			}));

			try {
				await apiClient.patch(`/goals/${goalId}/todos/reorder`, entries);
			} finally {
				await mutate();
			}
		},
		[apiClient, data, mutate],
	);

	return {
		todos,
		aiTodos,
		myTodos,
		goalsWithTodos,
		isLoading: isLoading || !isLoaded,
		error,
		toggleTodoComplete,
		addTodo,
		updateTodo,
		deleteTodo,
		reorderTodos,
	};
}
