import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { goals } from "./goals";
import { users } from "./users";

export const coachConversations = sqliteTable(
	"coach_conversations",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		// goal削除後もオーナーを特定する必要があるため、goalId経由の推移従属排除は適用せず直接持つ
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		// 目標削除後もチャットは残すため、goalIdはnullable（goals.categoryIdと同じset nullパターン）
		goalId: text("goalId").references(() => goals.id, { onDelete: "set null" }),
		// goal削除後も「何の話だったか」がわかるよう会話開始時のタイトル・期限を保持する
		goalTitleSnapshot: text("goalTitleSnapshot").notNull(),
		goalDeadlineSnapshot: text("goalDeadlineSnapshot"),
		createdAt: text("createdAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
		updatedAt: text("updatedAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	(table) => [
		index("idx_coach_conversations_user_id").on(table.userId),
		// goalIdごとに1スレッドをDBレベルで保証（check-then-insertの競合対策）。
		// goalIdはnullableで、SQLiteはNULL同士を区別するため、goal削除後の会話は複数残せる。
		uniqueIndex("idx_coach_conversations_user_goal_id").on(table.userId, table.goalId),
	],
);
