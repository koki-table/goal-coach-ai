import type Stripe from "stripe";
import { SubscriptionRepository } from "../../../common/repositories/subscriptionRepository";
import type { Database } from "../../../db";
import type { SubscriptionStatus, SubscriptionTier } from "../../../db/schema/constants";
import type { Bindings } from "../../../types/env";

// Stripeのsubscription.statusをこのアプリのSubscriptionStatusへ写す。trialingは
// 使わない運用のためactive扱い、incomplete系はpast_due扱い(即時ダウングレードしない
// グレース期間の考え方に合わせる)
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
	switch (stripeStatus) {
		case "active":
		case "trialing":
			return "active";
		case "canceled":
		case "unpaid":
			return "canceled";
		default:
			return "past_due";
	}
}

function resolveTierFromPriceId(priceId: string | undefined, env: Bindings): SubscriptionTier {
	if (
		priceId &&
		(priceId === env.STRIPE_PRICE_ID_MONTHLY || priceId === env.STRIPE_PRICE_ID_YEARLY)
	) {
		return "pro";
	}
	return "free";
}

export class StripeWebhookService {
	private subscriptionRepo: SubscriptionRepository;

	constructor(private db: Database) {
		this.subscriptionRepo = new SubscriptionRepository(db);
	}

	async handleEvent(event: Stripe.Event, env: Bindings) {
		switch (event.type) {
			case "checkout.session.completed":
				await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
				return;
			case "customer.subscription.created":
			case "customer.subscription.updated":
				await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription, env);
				return;
			case "customer.subscription.deleted":
				await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
				return;
			case "invoice.payment_failed":
				await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
				return;
			default:
				return;
		}
	}

	private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
		const userId = session.client_reference_id;
		const stripeCustomerId =
			typeof session.customer === "string" ? session.customer : session.customer?.id;
		if (!userId || !stripeCustomerId) return;

		const stripeSubscriptionId =
			typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

		const existing = await this.subscriptionRepo.findByUserId(userId);
		if (existing) {
			await this.subscriptionRepo.updateByStripeCustomerId(stripeCustomerId, {
				stripeSubscriptionId,
				tier: "pro",
				status: "active",
			});
			return;
		}

		await this.subscriptionRepo.create({
			userId,
			stripeCustomerId,
			stripeSubscriptionId,
			tier: "pro",
			status: "active",
		});
	}

	private async handleSubscriptionUpdated(subscription: Stripe.Subscription, env: Bindings) {
		const stripeCustomerId =
			typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
		const priceId = subscription.items.data[0]?.price.id;
		const currentPeriodEnd = subscription.items.data[0]?.current_period_end
			? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
			: undefined;

		const existing = await this.subscriptionRepo.findByStripeCustomerId(stripeCustomerId);
		if (!existing) {
			// checkout.session.completedより先にこのイベントが届いた場合の防御的処理。
			// userIdが分からないためここでは新規作成できず、後続のcheckout完了時に作成される
			return;
		}

		await this.subscriptionRepo.updateByStripeCustomerId(stripeCustomerId, {
			stripeSubscriptionId: subscription.id,
			stripePriceId: priceId,
			tier: resolveTierFromPriceId(priceId, env),
			status: mapStripeStatus(subscription.status),
			currentPeriodEnd,
		});
	}

	private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
		const stripeCustomerId =
			typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

		// customerIdは保持する(再課金・ポータルアクセスに備える)。tierのみfreeへ戻す
		await this.subscriptionRepo.updateByStripeCustomerId(stripeCustomerId, {
			tier: "free",
			status: "canceled",
			stripeSubscriptionId: null,
			stripePriceId: null,
			currentPeriodEnd: null,
		});
	}

	private async handlePaymentFailed(invoice: Stripe.Invoice) {
		const stripeCustomerId =
			typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
		if (!stripeCustomerId) return;

		// tierは変更しない(グレース期間: Stripeの自動リトライと並行して即時ダウングレードしない)
		await this.subscriptionRepo.updateByStripeCustomerId(stripeCustomerId, {
			status: "past_due",
		});
	}
}
