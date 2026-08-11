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

// "undecided"はObjective(目標)がまだ決まっていない探索スレッド、
// "decided"はObjectiveが確定し目標に紐づいた通常スレッド
export const objectiveStatuses = ["decided", "undecided"] as const;
export type ObjectiveStatus = (typeof objectiveStatuses)[number];

// GROWサイクル(Goal→Reality & Vision→Insights→Action)に沿ったコーチングセッションの
// フェーズ。objectiveStatus="decided"(通常スレッド)でのみ使用し、"undecided"(探索スレッド)
// では常に既定値"theme"のまま更新・参照しない(理由はdocs/coach-chat.md参照)
export const coachSessionPhases = ["theme", "reality", "insight", "action", "closed"] as const;
export type CoachSessionPhase = (typeof coachSessionPhases)[number];

// 課金プランのtier。行が存在しない場合はfree扱い(userSubscriptions.ts参照)
export const subscriptionTiers = ["free", "pro"] as const;
export type SubscriptionTier = (typeof subscriptionTiers)[number];

// Stripeサブスクリプションの状態。past_dueは支払い失敗中(tierはまだ変更しない)
export const subscriptionStatuses = ["active", "past_due", "canceled"] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
