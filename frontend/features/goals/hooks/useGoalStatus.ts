import { useCallback, useState } from "react";
import useSWR from "swr";
import type { SwrResponse } from "@/lib/swr/types";
import type { GoalStatus, Task, TaskBoard } from "../types";
import type { GoalStatusInput, TaskInput } from "../schemas/goalSchema";

// モックデータ: AI生成タスク
const mockAiGeneratedTasks: Task[] = [
	{
		id: "ai-task-1",
		title: "TOEICリスニングパート3の練習問題を20問解く",
		dueDate: "2026-05-27",
		estimatedMinutes: 45,
		completed: false,
		isAiGenerated: true,
		createdAt: "2026-05-26T00:00:00.000Z",
	},
	{
		id: "ai-task-2",
		title: "英単語帳 Chapter 5 の暗記（50語）",
		dueDate: "2026-05-27",
		estimatedMinutes: 30,
		completed: false,
		isAiGenerated: true,
		createdAt: "2026-05-26T00:00:00.000Z",
	},
	{
		id: "ai-task-3",
		title: "TOEICリーディング模試 Part 7 を時間計測して解く",
		dueDate: "2026-05-28",
		estimatedMinutes: 60,
		completed: false,
		isAiGenerated: true,
		createdAt: "2026-05-26T00:00:00.000Z",
	},
	{
		id: "ai-task-4",
		title: "文法問題集 Unit 12 完了（関係代名詞）",
		dueDate: "2026-05-29",
		estimatedMinutes: 40,
		completed: false,
		isAiGenerated: true,
		createdAt: "2026-05-26T00:00:00.000Z",
	},
	{
		id: "ai-task-5",
		title: "シャドーイング練習 15分（TED Talk）",
		dueDate: "2026-05-27",
		estimatedMinutes: 15,
		completed: false,
		isAiGenerated: true,
		createdAt: "2026-05-26T00:00:00.000Z",
	},
];

// モックデータ: マイTODO
const mockMyTodos: Task[] = [
	{
		id: "my-task-1",
		title: "英単語アプリで30分学習",
		dueDate: "2026-05-26",
		estimatedMinutes: 30,
		completed: true,
		isAiGenerated: false,
		createdAt: "2026-05-25T00:00:00.000Z",
	},
	{
		id: "my-task-2",
		title: "リスニング問題集 Part 2 を解く",
		dueDate: "2026-05-26",
		estimatedMinutes: 25,
		completed: false,
		isAiGenerated: false,
		createdAt: "2026-05-25T00:00:00.000Z",
	},
];

// モックデータ: 目標ステータス
const mockGoalStatus: GoalStatus = {
	goalId: "goal-1",
	progressPercent: 28,
	memo: "リスニングは順調。リーディングのPart 7が課題。",
	obstacles: "仕事が忙しく、平日の学習時間確保が難しい。",
	achievementProbability: 32,
	coachFeedback:
		"あなたの現状の作業速度を維持した場合、目標達成確率は32%です。現在のペースでは1日あたり0.8タスクの消化ですが、目標達成には1日2.5タスクの消化が必要です。特にリーディング対策が遅れています。週末の学習時間を2時間→4時間に増やすことを強く推奨します。このままでは失敗します。",
	velocity: 0.8,
};

// ストア（メモリ内）
let taskBoardStore: TaskBoard = {
	aiGeneratedTasks: [...mockAiGeneratedTasks],
	myTodos: [...mockMyTodos],
};
let goalStatusStore: GoalStatus = { ...mockGoalStatus };

// モックフェッチャー
const mockTaskBoardFetcher = (): Promise<TaskBoard> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({ ...taskBoardStore });
		}, 200);
	});
};

const mockGoalStatusFetcher = (): Promise<GoalStatus> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({ ...goalStatusStore });
		}, 200);
	});
};

export type UseGoalStatusReturn = SwrResponse<GoalStatus> & {
	taskBoard: TaskBoard | undefined;
	taskBoardLoading: boolean;
	updateStatus: (input: GoalStatusInput) => Promise<GoalStatus>;
	moveTaskToMyTodos: (taskId: string) => Promise<void>;
	moveTaskToAiGenerated: (taskId: string) => Promise<void>;
	toggleTaskComplete: (taskId: string) => Promise<void>;
	addTask: (input: TaskInput, isMyTodo: boolean) => Promise<Task>;
	updateTask: (taskId: string, input: Partial<TaskInput>) => Promise<Task>;
	deleteTask: (taskId: string) => Promise<void>;
	requestAiReview: () => Promise<GoalStatus>;
	reorderTasks: (
		sourceList: "aiGeneratedTasks" | "myTodos",
		sourceIndex: number,
		destinationList: "aiGeneratedTasks" | "myTodos",
		destinationIndex: number,
	) => Promise<void>;
};

export function useGoalStatus(goalId: string): UseGoalStatusReturn {
	const [isUpdating, setIsUpdating] = useState(false);

	// 目標ステータスのSWR
	const {
		data: statusData,
		error: statusError,
		isLoading: statusLoading,
		isValidating: statusValidating,
		mutate: mutateStatus,
	} = useSWR<GoalStatus>(`/api/goals/${goalId}/status`, mockGoalStatusFetcher, {
		fallbackData: goalStatusStore,
		revalidateOnFocus: false,
	});

	// タスクボードのSWR
	const {
		data: taskBoardData,
		error: taskBoardError,
		isLoading: taskBoardLoading,
		mutate: mutateTaskBoard,
	} = useSWR<TaskBoard>(
		`/api/goals/${goalId}/task-board`,
		mockTaskBoardFetcher,
		{
			fallbackData: taskBoardStore,
			revalidateOnFocus: false,
		},
	);

	// ステータス更新
	const updateStatus = useCallback(
		async (input: GoalStatusInput): Promise<GoalStatus> => {
			setIsUpdating(true);
			try {
				goalStatusStore = {
					...goalStatusStore,
					...input,
				};
				await mutateStatus();
				return goalStatusStore;
			} finally {
				setIsUpdating(false);
			}
		},
		[mutateStatus],
	);

	// AI生成タスクをマイTODOに移動
	const moveTaskToMyTodos = useCallback(
		async (taskId: string): Promise<void> => {
			const task = taskBoardStore.aiGeneratedTasks.find((t) => t.id === taskId);
			if (!task) return;

			taskBoardStore = {
				aiGeneratedTasks: taskBoardStore.aiGeneratedTasks.filter(
					(t) => t.id !== taskId,
				),
				myTodos: [...taskBoardStore.myTodos, { ...task, isAiGenerated: false }],
			};
			await mutateTaskBoard();
		},
		[mutateTaskBoard],
	);

	// マイTODOをAI生成エリアに戻す
	const moveTaskToAiGenerated = useCallback(
		async (taskId: string): Promise<void> => {
			const task = taskBoardStore.myTodos.find((t) => t.id === taskId);
			if (!task) return;

			taskBoardStore = {
				aiGeneratedTasks: [
					...taskBoardStore.aiGeneratedTasks,
					{ ...task, isAiGenerated: true },
				],
				myTodos: taskBoardStore.myTodos.filter((t) => t.id !== taskId),
			};
			await mutateTaskBoard();
		},
		[mutateTaskBoard],
	);

	// タスク完了トグル
	const toggleTaskComplete = useCallback(
		async (taskId: string): Promise<void> => {
			taskBoardStore = {
				...taskBoardStore,
				myTodos: taskBoardStore.myTodos.map((t) =>
					t.id === taskId ? { ...t, completed: !t.completed } : t,
				),
			};
			await mutateTaskBoard();

			// 完了率に応じて確率を再計算（モック）
			const completedCount = taskBoardStore.myTodos.filter(
				(t) => t.completed,
			).length;
			const totalCount = taskBoardStore.myTodos.length;
			const newVelocity = totalCount > 0 ? completedCount / totalCount : 0;
			const newProbability = Math.min(
				100,
				Math.round(goalStatusStore.achievementProbability + newVelocity * 5),
			);

			goalStatusStore = {
				...goalStatusStore,
				velocity: Number((newVelocity + 0.8).toFixed(1)),
				achievementProbability: newProbability,
			};
			await mutateStatus();
		},
		[mutateTaskBoard, mutateStatus],
	);

	// タスク追加
	const addTask = useCallback(
		async (input: TaskInput, isMyTodo: boolean): Promise<Task> => {
			const newTask: Task = {
				...input,
				id: `task-${Date.now()}`,
				completed: false,
				isAiGenerated: !isMyTodo,
				createdAt: new Date().toISOString(),
			};

			if (isMyTodo) {
				taskBoardStore = {
					...taskBoardStore,
					myTodos: [...taskBoardStore.myTodos, newTask],
				};
			} else {
				taskBoardStore = {
					...taskBoardStore,
					aiGeneratedTasks: [...taskBoardStore.aiGeneratedTasks, newTask],
				};
			}
			await mutateTaskBoard();
			return newTask;
		},
		[mutateTaskBoard],
	);

	// タスク更新
	const updateTask = useCallback(
		async (taskId: string, input: Partial<TaskInput>): Promise<Task> => {
			let updatedTask: Task | undefined;

			taskBoardStore = {
				aiGeneratedTasks: taskBoardStore.aiGeneratedTasks.map((t) => {
					if (t.id === taskId) {
						updatedTask = { ...t, ...input };
						return updatedTask;
					}
					return t;
				}),
				myTodos: taskBoardStore.myTodos.map((t) => {
					if (t.id === taskId) {
						updatedTask = { ...t, ...input };
						return updatedTask;
					}
					return t;
				}),
			};

			if (!updatedTask) {
				throw new Error("タスクが見つかりません");
			}

			await mutateTaskBoard();
			return updatedTask;
		},
		[mutateTaskBoard],
	);

	// タスク削除
	const deleteTask = useCallback(
		async (taskId: string): Promise<void> => {
			taskBoardStore = {
				aiGeneratedTasks: taskBoardStore.aiGeneratedTasks.filter(
					(t) => t.id !== taskId,
				),
				myTodos: taskBoardStore.myTodos.filter((t) => t.id !== taskId),
			};
			await mutateTaskBoard();
		},
		[mutateTaskBoard],
	);

	// AIレビューリクエスト
	const requestAiReview = useCallback(async (): Promise<GoalStatus> => {
		setIsUpdating(true);
		try {
			// モック: AIレビュー結果を返す
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const completedTasks = taskBoardStore.myTodos.filter(
				(t) => t.completed,
			).length;
			const totalTasks =
				taskBoardStore.myTodos.length +
				taskBoardStore.aiGeneratedTasks.length;
			const newProbability = Math.min(
				100,
				Math.round((completedTasks / Math.max(totalTasks, 1)) * 100 + 20),
			);

			const feedbacks = [
				`現在のタスク消化率を分析しました。${completedTasks}/${taskBoardStore.myTodos.length}のタスクが完了しています。このペースでは目標達成確率は${newProbability}%です。`,
				"マイTODOに追加されたタスク量は適切ですが、実行速度が不足しています。1日あたりの学習時間を30分増やすことを推奨します。",
				"残り期間と未消化タスク数から逆算すると、現在のペースでは間に合いません。優先度の低いタスクを削除し、コアタスクに集中してください。",
			];

			goalStatusStore = {
				...goalStatusStore,
				achievementProbability: newProbability,
				coachFeedback: feedbacks[Math.floor(Math.random() * feedbacks.length)],
			};

			await mutateStatus();
			return goalStatusStore;
		} finally {
			setIsUpdating(false);
		}
	}, [mutateStatus]);

	// タスクの並び替え（ドラッグ＆ドロップ用）
	const reorderTasks = useCallback(
		async (
			sourceList: "aiGeneratedTasks" | "myTodos",
			sourceIndex: number,
			destinationList: "aiGeneratedTasks" | "myTodos",
			destinationIndex: number,
		): Promise<void> => {
			const sourceArray = [...taskBoardStore[sourceList]];
			const [movedTask] = sourceArray.splice(sourceIndex, 1);

			if (!movedTask) return;

			if (sourceList === destinationList) {
				// 同じリスト内での並び替え
				sourceArray.splice(destinationIndex, 0, movedTask);
				taskBoardStore = {
					...taskBoardStore,
					[sourceList]: sourceArray,
				};
			} else {
				// 異なるリスト間での移動
				const destArray = [...taskBoardStore[destinationList]];
				const updatedTask = {
					...movedTask,
					isAiGenerated: destinationList === "aiGeneratedTasks",
				};
				destArray.splice(destinationIndex, 0, updatedTask);

				taskBoardStore = {
					...taskBoardStore,
					[sourceList]: sourceArray,
					[destinationList]: destArray,
				};
			}

			await mutateTaskBoard();
		},
		[mutateTaskBoard],
	);

	return {
		data: statusData,
		error: statusError || taskBoardError,
		isLoading: statusLoading || isUpdating,
		isValidating: statusValidating,
		mutate: () => mutateStatus(),
		taskBoard: taskBoardData,
		taskBoardLoading,
		updateStatus,
		moveTaskToMyTodos,
		moveTaskToAiGenerated,
		toggleTaskComplete,
		addTask,
		updateTask,
		deleteTask,
		requestAiReview,
		reorderTasks,
	};
}
