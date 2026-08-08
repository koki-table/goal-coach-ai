import { NoStripeCustomerError } from "../../../common/errors";
import { CoachMessageRepository } from "../../../common/repositories/coachMessageRepository";
import { SubscriptionRepository } from "../../../common/repositories/subscriptionRepository";
import type { Database } from "../../../db";
import type { Bindings } from "../../../types/env";
import { createStripeClient } from "../lib/stripeClient";

export type BillingInterval = "monthly" | "yearly";

export class BillingService {
	// free tierの1日あたりdecided会話メッセージ上限。CoachChatGateと値を一致させる
	private static readonly FREE_DAILY_DECIDED_LIMIT = 3;
	private static readonly RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

	private subscriptionRepo: SubscriptionRepository;
	private messageRepo: CoachMessageRepository;

	constructor(private db: Database) {
		this.subscriptionRepo = new SubscriptionRepository(db);
		this.messageRepo = new CoachMessageRepository(db);
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
		const since = new Date(Date.now() - BillingService.RATE_LIMIT_WINDOW_MS).toISOString();
		const decidedMessagesUsedToday = await this.messageRepo.countUserMessagesByUserIdSince(
			userId,
			since,
			"decided",
		);

		return {
			tier: subscription?.tier ?? ("free" as const),
			status: subscription?.status ?? ("active" as const),
			currentPeriodEnd: subscription?.currentPeriodEnd ?? undefined,
			decidedMessagesUsedToday,
		};
	}
}
