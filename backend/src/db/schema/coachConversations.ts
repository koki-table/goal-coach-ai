import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { objectiveStatuses } from "./constants";
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
		// "undecided"(Objective(目標)未確定の探索スレッド)/"decided"(Objectiveが確定した通常スレッド)。
		// 採用によりundecided→decidedへ遷移する（linkGoalStmt参照）
		objectiveStatus: text("objectiveStatus", { enum: objectiveStatuses })
			.notNull()
			.default("decided"),
		// goal削除後も「何の話だったか」がわかるよう会話開始時のタイトル・期限を保持する。
		// objectiveStatus='undecided'の間は「検討中のテーマラベル」（初期値"目標を決める相談"）として
		// 使い、採用時に実タイトルへ上書きする。NOT NULLはSQLiteでの型変更(drizzle-kitのテーブル再作成、
		// cascade FKを持つcoach_messagesが絡み危険)を避けるため意図的に維持し、列の意味をobjectiveStatus
		// で使い分ける（1列1意味の原則からの意図的逸脱。詳細はdocs/coach-chat.md参照）
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
		// 探索スレッドはユーザーに1本だけ。採用でgoalIdが入ると索引対象から外れ、
		// 上のuser_goal_idユニークが「1目標1スレッド」を引き継ぐ
		uniqueIndex("idx_coach_conversations_user_undecided_objective")
			.on(table.userId)
			.where(sql`${table.objectiveStatus} = 'undecided' AND ${table.goalId} IS NULL`),
		// 新規列のためDBレベルで不変条件を保証する（既存のrole/taskType等の列は
		// 遡及適用しない。.claude/rules/backend.mdの「不変条件はDBで保証する」に従う）
		check(
			"chk_coach_conversations_objective_status",
			sql`${table.objectiveStatus} IN ('decided', 'undecided')`,
		),
	],
);
