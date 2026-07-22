import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { coachEvaluations } from "./coachEvaluations";

export const coachEvaluationSuggestions = sqliteTable(
	"coach_evaluation_suggestions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		evaluationId: text("evaluationId")
			.notNull()
			.references(() => coachEvaluations.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		sortOrder: integer("sortOrder").notNull().default(0),
	},
	(table) => [
		index("idx_coach_eval_suggestions_eval_order").on(table.evaluationId, table.sortOrder),
	],
);
