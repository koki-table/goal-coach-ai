import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { userSubscriptions } from "../../db/schema";
import type { SubscriptionStatus, SubscriptionTier } from "../../db/schema/constants";

export class SubscriptionRepository {
	constructor(private db: Database) {}

	// 行が存在しない場合はundefined。呼び出し側でtier:"free"扱いに変換する
	async findByUserId(userId: string) {
		return this.db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, userId))
			.get();
	}

	async findByStripeCustomerId(stripeCustomerId: string) {
		return this.db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.stripeCustomerId, stripeCustomerId))
			.get();
	}

	// checkout.session.completed時、初回のみ行を新規作成する
	async create(data: {
		userId: string;
		stripeCustomerId: string;
		stripeSubscriptionId?: string;
		stripePriceId?: string;
		tier: SubscriptionTier;
		status: SubscriptionStatus;
		currentPeriodEnd?: string;
		lastEventCreatedAt?: string;
	}) {
		return this.db.insert(userSubscriptions).values(data).returning().get();
	}

	// customer.subscription.updated/deleted, invoice.payment_failed 用。
	// stripeCustomerIdで対象行を特定して更新する(userIdでの絞り込みは不要。Webhookは
	// アプリケーション認証ユーザーの文脈を持たず、Stripe側で既に検証済みのcustomerIdが
	// 一意キーのため)
	async updateByStripeCustomerId(
		stripeCustomerId: string,
		data: Partial<{
			stripeSubscriptionId: string | null;
			stripePriceId: string | null;
			tier: SubscriptionTier;
			status: SubscriptionStatus;
			currentPeriodEnd: string | null;
			lastEventCreatedAt: string;
		}>,
	) {
		return this.db
			.update(userSubscriptions)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(eq(userSubscriptions.stripeCustomerId, stripeCustomerId))
			.returning()
			.get();
	}
}
