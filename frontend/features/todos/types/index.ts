import type {
	MilestoneInput,
	MilestoneLevel,
	TodoInput,
} from "../schemas/todoSchema";

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

// マイルストーンレベルの表示名マッピング
export const milestoneLevelLabels: Record<MilestoneLevel, string> = {
	short: "短期目標",
	medium: "中期目標",
	long: "長期目標",
};

// マイルストーンレベルの順序
export const milestoneLevelOrder: Record<MilestoneLevel, number> = {
	short: 1,
	medium: 2,
	long: 3,
};

export type { MilestoneLevel };
