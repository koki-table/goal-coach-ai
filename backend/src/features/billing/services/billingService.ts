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

	async getStatus(userId: string) {
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
		};
	}
}
