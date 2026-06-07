import { foreignKey, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { goals } from "./goals";
import { milestones } from "./milestones";

export const todos = sqliteTable(
	"todos",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		goalId: text("goalId")
			.notNull()
			.references(() => goals.id, { onDelete: "cascade" }),
		milestoneId: text("milestoneId"),
		title: text("title").notNull(),
		description: text("description"),
		isCompleted: integer("isCompleted").notNull().default(0),
		completedAt: text("completedAt"),
		priority: text("priority").notNull().default("medium"),
		dueDate: text("dueDate"),
		estimatedMinutes: integer("estimatedMinutes"),
		sortOrder: integer("sortOrder").notNull().default(0),
		createdAt: text("createdAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
		updatedAt: text("updatedAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	(table) => [
		index("idx_todos_goal_id").on(table.goalId),
		index("idx_todos_milestone_id").on(table.milestoneId),
		index("idx_todos_due_date").on(table.dueDate),
		foreignKey({
			columns: [table.milestoneId, table.goalId],
			foreignColumns: [milestones.id, milestones.goalId],
		}).onDelete("set null"),
	],
);
