import { createApiClient } from "@/lib/swr/apiClient";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import useSWR from "swr";
import type { TodoInput } from "../schemas/todoSchema";
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
	const { getToken } = useAuth();
	const apiClient = createApiClient(getToken);

	const { data, error, isLoading, mutate } = useSWR<GoalWithTodos[]>("/todos");

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
			// 楽観更新: ローカルで並び替えを反映
			const currentData = data ? [...data] : [];
			const goalGroup = currentData.find((g) => g.goalId === goalId);
			if (!goalGroup) return;

			const sourceArr =
				_sourceList === "aiTodos" ? [...goalGroup.aiGeneratedTodos] : [...goalGroup.myTodos];
			const [movedTodo] = sourceArr.splice(sourceIndex, 1);
			if (!movedTodo) return;

			if (_sourceList === _destinationList) {
				sourceArr.splice(destinationIndex, 0, movedTodo);
				const updatedGroup = {
					...goalGroup,
					[_sourceList === "aiTodos" ? "aiGeneratedTodos" : "myTodos"]: sourceArr,
				};
				const optimistic = currentData.map((g) => (g.goalId === goalId ? updatedGroup : g));
				mutate(optimistic, false);
			} else {
				const destArr =
					_destinationList === "aiTodos" ? [...goalGroup.aiGeneratedTodos] : [...goalGroup.myTodos];
				destArr.splice(destinationIndex, 0, {
					...movedTodo,
					isAiGenerated: _destinationList === "aiTodos",
				});
				const updatedGroup = {
					...goalGroup,
					[_sourceList === "aiTodos" ? "aiGeneratedTodos" : "myTodos"]: sourceArr,
					[_destinationList === "aiTodos" ? "aiGeneratedTodos" : "myTodos"]: destArr,
				};
				const optimistic = currentData.map((g) => (g.goalId === goalId ? updatedGroup : g));
				mutate(optimistic, false);
			}

			// API にリオーダーを送信
			const goalGroup2 = (data ?? []).find((g) => g.goalId === goalId);
			if (!goalGroup2) return;
			const allTodosForGoal = [...goalGroup2.aiGeneratedTodos, ...goalGroup2.myTodos];
			const entries = allTodosForGoal.map((t, idx) => ({
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
		isLoading,
		error,
		toggleTodoComplete,
		addTodo,
		deleteTodo,
		reorderTodos,
	};
}
