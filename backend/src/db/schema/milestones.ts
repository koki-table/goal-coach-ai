import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
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
		// 定量KR(Key Results)の測定値。進捗% = (current - start) / (target - start)。
		// startは通常0、targetは達成水準、unitは点/件/%等の単位表示用。
		startValue: real("startValue").notNull().default(0),
		currentValue: real("currentValue").notNull().default(0),
		targetValue: real("targetValue").notNull().default(1),
		unit: text("unit").notNull().default(""),
		// isCompletedは currentValue >= targetValue から導出して同期する（真偽の実体は測定値側）
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
