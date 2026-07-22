import type { MilestoneInput, TodoInput } from "../schemas/todoSchema";

// 優先度の型定義
export type TodoPriority = "low" | "medium" | "high";

// タスク種別の型定義（daily=毎日リセット / once=一回のみ）
export type TaskType = "daily" | "once";

// マイルストーンの型定義
export type Milestone = MilestoneInput & {
	id: string;
	goalId: string;
	isCompleted: boolean;
	createdAt: string;
};

// TODOの型定義
export type Todo = TodoInput & {
	id: string;
	goalId: string;
	milestoneId?: string;
	priority?: TodoPriority;
	taskType: TaskType;
	description?: string;
	completed: boolean;
	completionCount: number; // 累計完了回数（繰り返し完了用）
	isAiGenerated: boolean;
	createdAt: string;
};

// TODO付き目標グループ
export type GoalWithTodos = {
	goalId: string;
	goalTitle: string;
	milestones: Milestone[];
	aiGeneratedTodos: Todo[];
	myTodos: Todo[];
};
