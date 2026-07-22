import { and, asc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import { todos } from "../../db/schema";
import type { TaskType } from "../../db/schema/constants";

export class TodoRepository {
	constructor(private db: Database) {}

	async findAllByGoalIds(goalIds: string[]) {
		if (goalIds.length === 0) return [];
		return this.db
			.select()
			.from(todos)
			.where(inArray(todos.goalId, goalIds))
			.orderBy(asc(todos.sortOrder), asc(todos.createdAt))
			.all();
	}

	async findAllByGoalId(goalId: string) {
		return this.db
			.select()
			.from(todos)
			.where(eq(todos.goalId, goalId))
			.orderBy(asc(todos.sortOrder), asc(todos.createdAt))
			.all();
	}

	async findById(id: string) {
		return this.db.select().from(todos).where(eq(todos.id, id)).get();
	}

	async create(data: {
		goalId: string;
		title: string;
		description?: string;
		dueDate?: string;
		estimatedMinutes?: number;
		milestoneId?: string;
		priority?: string;
		taskType?: TaskType;
		isAiGenerated?: number;
	}) {
		return this.db.insert(todos).values(data).returning().get();
	}

	async update(
		id: string,
		data: Partial<{
			title: string;
			description: string;
			dueDate: string;
			estimatedMinutes: number;
			milestoneId: string;
			priority: string;
			taskType: TaskType;
			isCompleted: number;
			completedAt: string | null;
			sortOrder: number;
			isAiGenerated: number;
		}>,
	) {
		return this.db
			.update(todos)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(eq(todos.id, id))
			.returning()
			.get();
	}

	// デイリータスクの完了チェックを一括リセット（Cron Trigger から実行）
	// completionCount は todo_logs 由来のため影響しない
	async resetDailyCompletion() {
		return this.db
			.update(todos)
			.set({ isCompleted: 0, completedAt: null, updatedAt: new Date().toISOString() })
			.where(and(eq(todos.taskType, "daily"), eq(todos.isCompleted, 1)))
			.run();
	}

	async updateSortOrders(entries: { id: string; sortOrder: number }[]) {
		const now = new Date().toISOString();
		const results = [];
		for (const entry of entries) {
			const result = await this.db
				.update(todos)
				.set({ sortOrder: entry.sortOrder, updatedAt: now })
				.where(eq(todos.id, entry.id))
				.returning()
				.get();
			if (result) results.push(result);
		}
		return results;
	}

	async delete(id: string) {
		return this.db.delete(todos).where(eq(todos.id, id)).returning().get();
	}

	// db.batch() 用のステートメント（実行しない）
	unlinkByMilestoneIdsStmt(milestoneIds: string[]) {
		return this.db
			.update(todos)
			.set({ milestoneId: null, updatedAt: new Date().toISOString() })
			.where(inArray(todos.milestoneId, milestoneIds));
	}

	// db.batch() 用のステートメント（実行しない）
	unlinkByGoalIdStmt(goalId: string) {
		return this.db
			.update(todos)
			.set({ milestoneId: null, updatedAt: new Date().toISOString() })
			.where(eq(todos.goalId, goalId));
	}
}
