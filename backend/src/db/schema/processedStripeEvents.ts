import { sqliteTable, text } from "drizzle-orm/sqlite-core";

// Stripe Webhookの冗長配信対策。event.id(evt_...)をそのままPKにしてinsert-firstで
// 冪等性を保証する(unique制約違反 = 既に処理済みとして即200を返す)。
export const processedStripeEvents = sqliteTable("processed_stripe_events", {
	id: text("id").primaryKey(),
	eventType: text("eventType").notNull(),
	processedAt: text("processedAt")
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
});
