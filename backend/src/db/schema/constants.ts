export const defaultCategories = [
	{ name: "学習", color: "#3B82F6" },
	{ name: "仕事", color: "#8B5CF6" },
	{ name: "健康", color: "#10B981" },
	{ name: "スキル", color: "#F59E0B" },
	{ name: "財務", color: "#6366F1" },
	{ name: "その他", color: "#6B7280" },
] as const;

export const todoLogTypes = ["completed", "started", "paused"] as const;
export type TodoLogType = (typeof todoLogTypes)[number];

export const taskTypes = ["daily", "once"] as const;
export type TaskType = (typeof taskTypes)[number];

export const coachMessageRoles = ["user", "assistant"] as const;
export type CoachMessageRole = (typeof coachMessageRoles)[number];
