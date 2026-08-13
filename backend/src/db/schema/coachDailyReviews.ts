import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { coachMessages } from "./coachMessages";
import { goals } from "./goals";

// 日次レビュージョブの冪等性を保証する予約テーブル。1goal×1日に1回だけ実行されることを
// UNIQUE(goalId, reviewDate)で保証する(coachDailyUsageのUNIQUE(userId, date)と同系統)。
// LLM呼び出し前にINSERTで実行権を予約し、成功後にmessageIdを紐づける。予約後にLLM呼び出しが
// 失敗した場合は行を残したまま何もしない(当日は再試行しない。理由は
// dailyGoalReviewService.tsのコメント参照)。
export const coachDailyReviews = sqliteTable(
	"coach_daily_reviews",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		goalId: text("goalId")
			.notNull()
			.references(() => goals.id, { onDelete: "cascade" }),
		// UTC基準のYYYY-MM-DD文字列。todayIsoDate()と同じ形式
		reviewDate: text("reviewDate").notNull(),
		// LLM呼び出し成功時のみ設定する。失敗時はnullのまま残る
		messageId: integer("messageId").references(() => coachMessages.id, { onDelete: "set null" }),
		createdAt: text("createdAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	(table) => [uniqueIndex("idx_coach_daily_reviews_goal_date").on(table.goalId, table.reviewDate)],
);
