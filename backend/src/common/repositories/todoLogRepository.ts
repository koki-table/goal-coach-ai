import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { todoLogs } from "../../db/schema";
import type { TodoLogType } from "../../db/schema";

export class TodoLogRepository {
	constructor(private db: Database) {}

	async countCompletedByTodoIds(todoIds: string[]): Promise<Map<string, number>> {
		if (todoIds.length === 0) return new Map();
		const results = await this.db
			.select({
				todoId: todoLogs.todoId,
				count: sql<number>`count(*)`.as("count"),
			})
			.from(todoLogs)
			.where(and(inArray(todoLogs.todoId, todoIds), eq(todoLogs.type, "completed")))
			.groupBy(todoLogs.todoId)
			.all();

		const map = new Map<string, number>();
		for (const row of results) {
			map.set(row.todoId, row.count);
		}
		return map;
	}

	async create(data: { todoId: string; type: TodoLogType }) {
		return this.db.insert(todoLogs).values(data).returning().get();
	}
}
