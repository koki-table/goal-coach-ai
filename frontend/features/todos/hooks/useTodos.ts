import { useCallback } from "react";
import useSWR from "swr";
import type { Todo, GoalWithTodos } from "../types";
import type { TodoInput } from "../schemas/todoSchema";

// モックデータ: 目標情報
const mockGoals = [
	{ id: "goal-1", title: "TOEIC 900点取得" },
	{ id: "goal-2", title: "フルマラソン完走" },
];

// モックデータ: AI生成TODO
const mockAiTodos: Todo[] = [
	{
		id: "ai-todo-1",
		goalId: "goal-1",
		title: "TOEICリスニングパート3の練習問題を20問解く",
		dueDate: "2026-05-27",
		estimatedMinutes: 45,
		completed: false,
		completionCount: 0,
		isAiGenerated: true,
		createdAt: "2026-05-26T00:00:00.000Z",
	},
	{
		id: "ai-todo-2",
		goalId: "goal-1",
		title: "英単語帳 Chapter 5 の暗記（50語）",
		dueDate: "2026-05-27",
		estimatedMinutes: 30,
		completed: false,
		completionCount: 0,
		isAiGenerated: true,
		createdAt: "2026-05-26T00:00:00.000Z",
	},
	{
		id: "ai-todo-3",
		goalId: "goal-2",
		title: "5kmジョギング",
		dueDate: "2026-05-27",
		estimatedMinutes: 35,
		completed: false,
		completionCount: 0,
		isAiGenerated: true,
		createdAt: "2026-05-26T00:00:00.000Z",
	},
];

// モックデータ: マイTODO
const mockMyTodos: Todo[] = [
	{
		id: "my-todo-1",
		goalId: "goal-1",
		title: "英単語アプリで30分学習",
		dueDate: "2026-05-26",
		estimatedMinutes: 30,
		completed: true,
		completionCount: 5,
		isAiGenerated: false,
		createdAt: "2026-05-25T00:00:00.000Z",
	},
	{
		id: "my-todo-2",
		goalId: "goal-1",
		title: "リスニング問題集 Part 2 を解く",
		dueDate: "2026-05-26",
		estimatedMinutes: 25,
		completed: false,
		completionCount: 2,
		isAiGenerated: false,
		createdAt: "2026-05-25T00:00:00.000Z",
	},
	{
		id: "my-todo-3",
		goalId: "goal-2",
		title: "ストレッチ15分",
		dueDate: "2026-05-26",
		estimatedMinutes: 15,
		completed: false,
		completionCount: 8,
		isAiGenerated: false,
		createdAt: "2026-05-25T00:00:00.000Z",
	},
];

// ストア（メモリ内操作用）
let aiTodosStore = [...mockAiTodos];
let myTodosStore = [...mockMyTodos];

type UseTodosReturn = {
	todos: Todo[];
	aiTodos: Todo[];
	myTodos: Todo[];
	goalsWithTodos: GoalWithTodos[];
	isLoading: boolean;
	error: Error | undefined;
	toggleTodoComplete: (todoId: string) => Promise<void>;
	resetTodo: (todoId: string) => Promise<void>;
	addTodo: (
		goalId: string,
		input: TodoInput,
		isAiGenerated?: boolean,
	) => Promise<Todo>;
	deleteTodo: (todoId: string) => Promise<void>;
	moveTodoToMyTodos: (todoId: string) => Promise<void>;
	moveTodoToAiGenerated: (todoId: string) => Promise<void>;
	reorderTodos: (
		sourceList: "aiTodos" | "myTodos",
		sourceIndex: number,
		destinationList: "aiTodos" | "myTodos",
		destinationIndex: number,
		goalId: string,
	) => Promise<void>;
};

export function useTodos(): UseTodosReturn {
	const {
		data,
		error,
		isLoading,
		mutate,
	} = useSWR<{ aiTodos: Todo[]; myTodos: Todo[] }>(
		"/api/todos",
		async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return { aiTodos: aiTodosStore, myTodos: myTodosStore };
		},
		{
			fallbackData: { aiTodos: aiTodosStore, myTodos: myTodosStore },
			revalidateOnFocus: false,
		},
	);

	const aiTodos = data?.aiTodos || [];
	const myTodos = data?.myTodos || [];
	const todos = [...aiTodos, ...myTodos];

	// 目標ごとにグループ化
	const goalsWithTodos: GoalWithTodos[] = mockGoals.map((goal) => ({
		goalId: goal.id,
		goalTitle: goal.title,
		milestones: [], // マイルストーンは別フックで取得
		aiGeneratedTodos: aiTodos.filter((t) => t.goalId === goal.id),
		myTodos: myTodos.filter((t) => t.goalId === goal.id),
	}));

	// TODO完了トグル（カウントアップ）
	const toggleTodoComplete = useCallback(
		async (todoId: string): Promise<void> => {
			// AI TODOの場合
			const aiIndex = aiTodosStore.findIndex((t) => t.id === todoId);
			if (aiIndex !== -1) {
				const todo = aiTodosStore[aiIndex];
				aiTodosStore[aiIndex] = {
					...todo,
					completed: !todo.completed,
					completionCount: !todo.completed
						? todo.completionCount + 1
						: todo.completionCount,
				};
				await mutate();
				return;
			}

			// マイTODOの場合
			const myIndex = myTodosStore.findIndex((t) => t.id === todoId);
			if (myIndex !== -1) {
				const todo = myTodosStore[myIndex];
				myTodosStore[myIndex] = {
					...todo,
					completed: !todo.completed,
					completionCount: !todo.completed
						? todo.completionCount + 1
						: todo.completionCount,
				};
				await mutate();
			}
		},
		[mutate],
	);

	// TODOリセット（完了状態のみリセット、カウントは維持）
	const resetTodo = useCallback(
		async (todoId: string): Promise<void> => {
			const aiIndex = aiTodosStore.findIndex((t) => t.id === todoId);
			if (aiIndex !== -1) {
				aiTodosStore[aiIndex] = {
					...aiTodosStore[aiIndex],
					completed: false,
				};
				await mutate();
				return;
			}

			const myIndex = myTodosStore.findIndex((t) => t.id === todoId);
			if (myIndex !== -1) {
				myTodosStore[myIndex] = {
					...myTodosStore[myIndex],
					completed: false,
				};
				await mutate();
			}
		},
		[mutate],
	);

	// TODO追加
	const addTodo = useCallback(
		async (
			goalId: string,
			input: TodoInput,
			isAiGenerated = false,
		): Promise<Todo> => {
			const newTodo: Todo = {
				id: `todo-${Date.now()}`,
				goalId,
				title: input.title,
				dueDate: input.dueDate,
				estimatedMinutes: input.estimatedMinutes,
				completed: false,
				completionCount: 0,
				isAiGenerated,
				createdAt: new Date().toISOString(),
			};

			if (isAiGenerated) {
				aiTodosStore = [...aiTodosStore, newTodo];
			} else {
				myTodosStore = [...myTodosStore, newTodo];
			}
			await mutate();
			return newTodo;
		},
		[mutate],
	);

	// TODO削除
	const deleteTodo = useCallback(
		async (todoId: string): Promise<void> => {
			aiTodosStore = aiTodosStore.filter((t) => t.id !== todoId);
			myTodosStore = myTodosStore.filter((t) => t.id !== todoId);
			await mutate();
		},
		[mutate],
	);

	// AI TODOをマイTODOに移動
	const moveTodoToMyTodos = useCallback(
		async (todoId: string): Promise<void> => {
			const todo = aiTodosStore.find((t) => t.id === todoId);
			if (!todo) return;

			aiTodosStore = aiTodosStore.filter((t) => t.id !== todoId);
			myTodosStore = [...myTodosStore, { ...todo, isAiGenerated: false }];
			await mutate();
		},
		[mutate],
	);

	// マイTODOをAI生成エリアに戻す
	const moveTodoToAiGenerated = useCallback(
		async (todoId: string): Promise<void> => {
			const todo = myTodosStore.find((t) => t.id === todoId);
			if (!todo) return;

			myTodosStore = myTodosStore.filter((t) => t.id !== todoId);
			aiTodosStore = [...aiTodosStore, { ...todo, isAiGenerated: true }];
			await mutate();
		},
		[mutate],
	);

	// TODOの並び替え
	const reorderTodos = useCallback(
		async (
			sourceList: "aiTodos" | "myTodos",
			sourceIndex: number,
			destinationList: "aiTodos" | "myTodos",
			destinationIndex: number,
			goalId: string,
		): Promise<void> => {
			const sourceStore =
				sourceList === "aiTodos" ? aiTodosStore : myTodosStore;
			const goalTodos = sourceStore.filter((t) => t.goalId === goalId);
			const [movedTodo] = goalTodos.splice(sourceIndex, 1);

			if (!movedTodo) return;

			if (sourceList === destinationList) {
				goalTodos.splice(destinationIndex, 0, movedTodo);
				const otherTodos = sourceStore.filter((t) => t.goalId !== goalId);
				if (sourceList === "aiTodos") {
					aiTodosStore = [...otherTodos, ...goalTodos];
				} else {
					myTodosStore = [...otherTodos, ...goalTodos];
				}
			} else {
				const destStore =
					destinationList === "aiTodos" ? aiTodosStore : myTodosStore;
				const destGoalTodos = destStore.filter((t) => t.goalId === goalId);
				const updatedTodo = {
					...movedTodo,
					isAiGenerated: destinationList === "aiTodos",
				};
				destGoalTodos.splice(destinationIndex, 0, updatedTodo);

				const sourceOther = sourceStore.filter((t) => t.goalId !== goalId);
				const destOther = destStore.filter((t) => t.goalId !== goalId);

				if (sourceList === "aiTodos") {
					aiTodosStore = [...sourceOther, ...goalTodos.filter((t) => t.id !== movedTodo.id)];
					myTodosStore = [...destOther, ...destGoalTodos];
				} else {
					myTodosStore = [...sourceOther, ...goalTodos.filter((t) => t.id !== movedTodo.id)];
					aiTodosStore = [...destOther, ...destGoalTodos];
				}
			}

			await mutate();
		},
		[mutate],
	);

	return {
		todos,
		aiTodos,
		myTodos,
		goalsWithTodos,
		isLoading,
		error,
		toggleTodoComplete,
		resetTodo,
		addTodo,
		deleteTodo,
		moveTodoToMyTodos,
		moveTodoToAiGenerated,
		reorderTodos,
	};
}
