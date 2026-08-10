import { sql } from "drizzle-orm";
import { check, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { subscriptionStatuses, subscriptionTiers } from "./constants";
import { users } from "./users";

// 行が存在しない = freeプラン。Stripe Checkout完了時に初めて行を作成する
// (既存ユーザーへのバックフィルは不要)。1ユーザー1行で、サブスク履行履歴は
// Stripe側を真実源とし複製しない。
export const userSubscriptions = sqliteTable(
	"user_subscriptions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		stripeCustomerId: text("stripeCustomerId").notNull(),
		// checkout.session.completed直後は確定するが、念のためnullableにしておく
		stripeSubscriptionId: text("stripeSubscriptionId"),
		stripePriceId: text("stripePriceId"),
		tier: text("tier", { enum: subscriptionTiers }).notNull().default("free"),
		status: text("status", { enum: subscriptionStatuses }).notNull().default("active"),
		currentPeriodEnd: text("currentPeriodEnd"),
		// Stripeのevent.created(unix seconds)をISO化して保持。Stripeはwebhookの配信順序を
		// 保証しないため、この行より古いevent.createdのcustomer.subscription.updatedは
		// 無視する(古いイベントによる新しい状態の巻き戻りを防ぐ)
		lastEventCreatedAt: text("lastEventCreatedAt"),
		createdAt: text("createdAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
		updatedAt: text("updatedAt")
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	(table) => [
		uniqueIndex("idx_user_subscriptions_user_id").on(table.userId),
		uniqueIndex("idx_user_subscriptions_stripe_customer_id").on(table.stripeCustomerId),
		check("chk_user_subscriptions_tier", sql`${table.tier} IN ('free','pro')`),
		check(
			"chk_user_subscriptions_status",
			sql`${table.status} IN ('active','past_due','canceled')`,
		),
	],
);
