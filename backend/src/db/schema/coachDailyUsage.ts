import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./users";

// decided会話でのメッセージ送信数を日単位(UTC基準のYYYY-MM-DD)でatomicに集計する。
// countUserMessagesByUserIdSince(coachConversations.objectiveStatusをJOINして数える方式)
// には2つの欠陥があった: (1) adoptObjective実行によりconversationが事後的にdecidedへ
// 書き換わるため、探索中に送った過去のメッセージまで遡ってカウントされてしまう、
// (2) レート制限チェック(読み取り)とメッセージ永続化(書き込み)が別ステップのため、
// 並列リクエストが同じ値を読んでしまうTOCTOUレースがあった。
// このテーブルへの「実際にdecided状態で送信した回数」をatomic UPSERTで直接
// increment&checkすることで両方を解消する(coachChatGate.ts参照)。
export const coachDailyUsage = sqliteTable(
	"coach_daily_usage",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		// UTC基準のYYYY-MM-DD文字列。CoachChatService.todayIsoDate()と同じ形式
		date: text("date").notNull(),
		decidedCount: integer("decidedCount").notNull().default(0),
		updatedAt: text("updatedAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	(table) => [uniqueIndex("idx_coach_daily_usage_user_date").on(table.userId, table.date)],
);
