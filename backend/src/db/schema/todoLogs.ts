import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { todoLogTypes } from "./constants";
import { todos } from "./todos";

export const todoLogs = sqliteTable(
	"todo_logs",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		todoId: text("todoId")
			.notNull()
			.references(() => todos.id, { onDelete: "cascade" }),
		type: text("type", { enum: [...todoLogTypes] }).notNull(),
		durationMinutes: integer("durationMinutes"),
		createdAt: text("createdAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	(table) => [
		index("idx_todo_logs_todo_id").on(table.todoId),
		index("idx_todo_logs_created_at").on(table.createdAt),
	],
);
