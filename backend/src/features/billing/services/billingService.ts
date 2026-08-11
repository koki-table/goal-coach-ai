import { NoStripeCustomerError } from "../../../common/errors";
import { FREE_DAILY_DECIDED_LIMIT } from "../../../common/helpers/coachChatLimit.helper";
import { todayIsoDate } from "../../../common/helpers/date.helper";
import { CoachDailyUsageRepository } from "../../../common/repositories/coachDailyUsageRepository";
import { SubscriptionRepository } from "../../../common/repositories/subscriptionRepository";
import type { Database } from "../../../db";
import type { Bindings } from "../../../types/env";
import { createStripeClient } from "../lib/stripeClient";

export type BillingInterval = "monthly" | "yearly";

export class BillingService {
	private subscriptionRepo: SubscriptionRepository;
	private usageRepo: CoachDailyUsageRepository;

	constructor(private db: Database) {
		this.subscriptionRepo = new SubscriptionRepository(db);
		this.usageRepo = new CoachDailyUsageRepository(db);
	}

	async createCheckoutSession(userId: string, interval: BillingInterval, env: Bindings) {
		const stripe = createStripeClient(env);
		const priceId =
			interval === "monthly" ? env.STRIPE_PRICE_ID_MONTHLY : env.STRIPE_PRICE_ID_YEARLY;
		if (!priceId) {
			throw new Error(`Stripe price id is not configured for interval: ${interval}`);
		}

		const existing = await this.subscriptionRepo.findByUserId(userId);
		const frontendUrl = env.FRONTEND_URL ?? "http://localhost:3000";

		const session = await stripe.checkout.sessions.create({
			mode: "subscription",
			line_items: [{ price: priceId, quantity: 1 }],
			client_reference_id: userId,
			customer: existing?.stripeCustomerId,
			success_url: `${frontendUrl}/settings/billing?checkout=success`,
			cancel_url: `${frontendUrl}/settings/billing?checkout=cancel`,
		});

		return { url: session.url };
	}

	async createPortalSession(userId: string, env: Bindings) {
		const stripe = createStripeClient(env);
		const subscription = await this.subscriptionRepo.findByUserId(userId);
		if (!subscription) {
			throw new NoStripeCustomerError(userId);
		}

		const frontendUrl = env.FRONTEND_URL ?? "http://localhost:3000";
		const session = await stripe.billingPortal.sessions.create({
			customer: subscription.stripeCustomerId,
			return_url: `${frontendUrl}/settings/billing`,
		});

		return { url: session.url };
	}

	async getStatus(userId: string, priceIds: { monthly?: string; yearly?: string }) {
		const subscription = await this.subscriptionRepo.findByUserId(userId);
		const decidedMessagesUsedToday = await this.usageRepo.getCount(userId, todayIsoDate());

		return {
			tier: subscription?.tier ?? ("free" as const),
			status: subscription?.status ?? ("active" as const),
			currentPeriodEnd: subscription?.currentPeriodEnd ?? undefined,
			decidedMessagesUsedToday,
			// フロントは独自にこの値をハードコードせず、常にこのAPIレスポンスの値を使う
			// (バックエンド側の定数変更とフロント表示の値がズレることを防ぐ)
			freeDailyDecidedLimit: FREE_DAILY_DECIDED_LIMIT,
			interval: resolveInterval(subscription?.stripePriceId, priceIds),
		};
	}
}

// stripePriceIdから月額/年額を判定する。free tier(行なし)や未知のpriceId(価格移行等)の
// 場合はundefinedを返し、フロント側で契約区分の表示を出さない。
// このメソッドはSTRIPE_SECRET_KEY等を必要としないため、呼び出し元(billingRoute.ts)から
// env全体ではなく必要な2値のみを受け取る(最小権限。他featureがenv全体を渡す既存の
// createCheckoutSession/createPortalSessionはStripe APIクライアント生成にSTRIPE_SECRET_KEYが
// 必要なため対象外)
function resolveInterval(
	stripePriceId: string | null | undefined,
	priceIds: { monthly?: string; yearly?: string },
): BillingInterval | undefined {
	if (!stripePriceId) return undefined;
	if (stripePriceId === priceIds.monthly) return "monthly";
	if (stripePriceId === priceIds.yearly) return "yearly";
	return undefined;
}
