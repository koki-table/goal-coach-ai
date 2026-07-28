const TODO_WEIGHT = 0.7;
const MILESTONE_WEIGHT = 0.3;
const RECENT_ACTIVITY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function ratio(completed: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((completed / total) * 100);
}

export type GoalSnapshotTodo = {
	isCompleted: number;
	completedAt: string | null;
	dueDate: string | null;
};

export type GoalSnapshotMilestone = {
	isCompleted: number;
};

export type GoalSnapshotTodoLog = {
	type: string;
	durationMinutes: number | null;
	createdAt: string;
};

export type GoalSnapshot = {
	realProgressPercent: number;
	totalTodos: number;
	completedTodos: number;
	totalMilestones: number;
	completedMilestones: number;
	overdueTodosCount: number;
	lastActivityAt: string | null;
	completedLast7Days: number;
	minutesSpentLast7Days: number;
};

// 既存DB(todos/milestones/todo_logs)から実進捗・行動指標を決定的に算出する。
// フロントの calculateGoalProgress と同じ重み付け(todo70%+milestone30%)をバックエンドで再現。
export function buildGoalSnapshot(
	todos: GoalSnapshotTodo[],
	milestones: GoalSnapshotMilestone[],
	todoLogs: GoalSnapshotTodoLog[],
	now: Date,
): GoalSnapshot {
	const totalTodos = todos.length;
	const completedTodos = todos.filter((t) => t.isCompleted === 1).length;
	const totalMilestones = milestones.length;
	const completedMilestones = milestones.filter((m) => m.isCompleted === 1).length;

	const todoProgress = ratio(completedTodos, totalTodos);
	const milestoneProgress = ratio(completedMilestones, totalMilestones);
	const realProgressPercent = computeRealProgress(
		totalTodos,
		totalMilestones,
		todoProgress,
		milestoneProgress,
	);

	// dueDateはカレンダー日として扱う。タイムスタンプ全体で比較すると当日中に期限切れになるため、日付部分のみ比較する
	const today = now.toISOString().slice(0, 10);
	const overdueTodosCount = todos.filter(
		(t) => t.isCompleted === 0 && t.dueDate !== null && t.dueDate.slice(0, 10) < today,
	).length;

	const activityTimestamps = [
		...todoLogs.map((l) => l.createdAt),
		...todos.filter((t) => t.completedAt !== null).map((t) => t.completedAt as string),
	];
	const lastActivityAt =
		activityTimestamps.length > 0 ? (activityTimestamps.sort().at(-1) ?? null) : null;

	const recentThreshold = new Date(now.getTime() - RECENT_ACTIVITY_DAYS * MS_PER_DAY).toISOString();
	const recentCompletedLogs = todoLogs.filter(
		(l) => l.type === "completed" && l.createdAt >= recentThreshold,
	);
	const completedLast7Days = recentCompletedLogs.length;

	const minutesSpentLast7Days = todoLogs
		.filter((l) => l.createdAt >= recentThreshold)
		.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0);

	return {
		realProgressPercent,
		totalTodos,
		completedTodos,
		totalMilestones,
		completedMilestones,
		overdueTodosCount,
		lastActivityAt,
		completedLast7Days,
		minutesSpentLast7Days,
	};
}

function computeRealProgress(
	totalTodos: number,
	totalMilestones: number,
	todoProgress: number,
	milestoneProgress: number,
): number {
	if (totalTodos === 0 && totalMilestones === 0) return 0;
	if (totalMilestones === 0) return todoProgress;
	if (totalTodos === 0) return milestoneProgress;
	return Math.round(todoProgress * TODO_WEIGHT + milestoneProgress * MILESTONE_WEIGHT);
}
