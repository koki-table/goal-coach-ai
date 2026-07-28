import type { MilestoneInput, TodoInput } from "../schemas/todoSchema";

// 優先度の型定義
export type TodoPriority = "low" | "medium" | "high";

// タスク種別の型定義（daily=毎日リセット / once=一回のみ）
export type TaskType = "daily" | "once";

// マイルストーン（定量Key Results）の型定義
// 進捗は startValue→targetValue に対する currentValue の到達度で表す（単位=unit）。
// isCompleted は currentValue >= targetValue から導出される（サーバで同期）。
export type Milestone = MilestoneInput & {
	id: string;
	goalId: string;
	isCompleted: boolean;
	startValue: number;
	currentValue: number;
	targetValue: number;
	unit: string;
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
