import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { goals } from "./goals";

export const milestones = sqliteTable(
	"milestones",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		goalId: text("goalId")
			.notNull()
			.references(() => goals.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		label: text("label"),
		dueDate: text("dueDate"),
		isCompleted: integer("isCompleted").notNull().default(0),
		completedAt: text("completedAt"),
		sortOrder: integer("sortOrder").notNull().default(0),
		createdAt: text("createdAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
		updatedAt: text("updatedAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	(table) => [
		index("idx_milestones_goal_id").on(table.goalId),
		uniqueIndex("idx_milestones_id_goal_id").on(table.id, table.goalId),
	],
);
