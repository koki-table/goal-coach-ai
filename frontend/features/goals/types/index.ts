import type {
	GoalCategoryType,
	GoalInput,
	GoalStatusInput,
	TaskInput,
} from "../schemas/goalSchema";

// 目標の型定義
export type Goal = GoalInput & {
	id: string;
	createdAt: string;
	updatedAt: string;
};

// タスクの型定義
export type Task = TaskInput & {
	id: string;
	completed: boolean;
	isAiGenerated: boolean;
	createdAt: string;
};

// 目標に紐づくステータス情報（進捗率・メモ・障害事項の現状入力）
export type GoalStatus = GoalStatusInput & {
	goalId: string;
};

// AI生成タスクとマイTODOを含むボード状態
export type TaskBoard = {
	aiGeneratedTasks: Task[];
	myTodos: Task[];
};

// カテゴリの表示名マッピング
export const categoryLabels: Record<GoalCategoryType, string> = {
	study: "学習",
	career: "キャリア",
	health: "健康",
	skill: "スキル",
	finance: "財務",
	other: "その他",
};
