import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { goals } from "./goals";

export const coachEvaluations = sqliteTable(
	"coach_evaluations",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		goalId: text("goalId")
			.notNull()
			.references(() => goals.id, { onDelete: "cascade" }),
		persona: text("persona").notNull().default("harsh"),
		// 入力スナップショット（評価時点の自己申告。goal statusは未永続化のためここに残す）
		progressPercent: integer("progressPercent").notNull(),
		memo: text("memo"),
		obstacles: text("obstacles"),
		// AI出力
		feedback: text("feedback").notNull(),
		successRate: integer("successRate").notNull(),
		createdAt: text("createdAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	// userIdは持たない（id→goalId→userIdの推移従属を排除／所有者はgoals joinで導出）
	(table) => [index("idx_coach_evaluations_goal_created").on(table.goalId, table.createdAt)],
);
