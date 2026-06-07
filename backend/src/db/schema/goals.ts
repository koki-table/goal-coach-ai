import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { goalCategories } from "./goalCategories";
import { users } from "./users";

export const goals = sqliteTable(
	"goals",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		categoryId: text("categoryId").references(() => goalCategories.id, {
			onDelete: "set null",
		}),
		status: text("status").notNull().default("active"),
		dueDate: text("dueDate"),
		completedAt: text("completedAt"),
		createdAt: text("createdAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
		updatedAt: text("updatedAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	(table) => [
		index("idx_goals_user_id").on(table.userId),
		index("idx_goals_user_status").on(table.userId, table.status),
		index("idx_goals_due_date").on(table.dueDate),
	],
);
