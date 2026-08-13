import type Stripe from "stripe";
import { SubscriptionRepository } from "../../../common/repositories/subscriptionRepository";
import type { Database } from "../../../db";
import type { SubscriptionStatus, SubscriptionTier } from "../../../db/schema/constants";
import type { Bindings } from "../../../types/env";
import { createStripeClient } from "../lib/stripeClient";

// Stripeのsubscription.statusをこのアプリのSubscriptionStatusへ写す。
// - active/trialing: 通常利用中
// - past_due: 支払いリトライ中のグレース期間。意図的にtierを落とさない(下記resolveTier参照)
// - それ以外(canceled/unpaid/incomplete/incomplete_expired/paused)は全て終端的な
//   非アクティブ状態として"canceled"に丸める。unpaid/incomplete_expired/pausedを
//   past_dueに丸めると「リトライ中」と誤認しtierがproに残り続けるバグになるため、
//   グレース期間として扱ってよいのはStripeが明示的にactiveへ復帰させようとしている
//   past_dueだけに限定する
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
	switch (stripeStatus) {
		case "active":
		case "trialing":
			return "active";
		case "past_due":
			return "past_due";
		default:
			return "canceled";
	}
}

// statusが終端的な非アクティブ状態(mapStripeStatusが"canceled"を返す)の場合は
// 価格IDに関係なく無条件でfreeへ落とす(support: unpaid/incomplete_expired等でも
// tierがproに残り続けていた欠陥の修正)。status="active"/"past_due"(グレース期間)の
// 場合は価格IDでpro/freeを判定するが、未知の価格ID(価格移行等)の場合は既存tierを
// 維持する(支払い継続中の顧客を価格変更の巻き添えで無料化しない)
function resolveTier(
	priceId: string | undefined,
	mappedStatus: SubscriptionStatus,
	existingTier: SubscriptionTier,
	env: Bindings,
): SubscriptionTier {
	if (mappedStatus === "canceled") return "free";
	if (
		priceId &&
		(priceId === env.STRIPE_PRICE_ID_MONTHLY || priceId === env.STRIPE_PRICE_ID_YEARLY)
	) {
		return "pro";
	}
	return existingTier;
}

// Stripeはwebhookイベントの配信順序を保証しない。DBに保存済みのlastEventCreatedAtより
// 古いevent.createdを持つイベントは無視し、古いイベントによる状態の巻き戻りを防ぐ
function isStaleEvent(eventCreatedIso: string, existingLastEventCreatedAt: string | null): boolean {
	return existingLastEventCreatedAt !== null && eventCreatedIso < existingLastEventCreatedAt;
}

// Customer Portalの「期間終了時にキャンセル」は、Portal設定(mode: "at_period_end")によっては
// cancel_at_period_endではなくcancel_at(期間終了時刻と同じ未来のタイムスタンプ)で表現される。
// 両方のケースを網羅するため、cancel_atが設定されていることもキャンセル予約の判定に使う
function isScheduledToCancel(subscription: Stripe.Subscription): boolean {
	return subscription.cancel_at_period_end || typeof subscription.cancel_at === "number";
}

export class StripeWebhookService {
	private subscriptionRepo: SubscriptionRepository;

	constructor(private db: Database) {
		this.subscriptionRepo = new SubscriptionRepository(db);
	}

	async handleEvent(event: Stripe.Event, env: Bindings) {
		const eventCreatedIso = new Date(event.created * 1000).toISOString();
		switch (event.type) {
			case "checkout.session.completed":
				await this.handleCheckoutCompleted(
					event.data.object as Stripe.Checkout.Session,
					eventCreatedIso,
					env,
				);
				return;
			case "customer.subscription.created":
			case "customer.subscription.updated":
				await this.handleSubscriptionUpdated(
					event.data.object as Stripe.Subscription,
					eventCreatedIso,
					env,
				);
				return;
			case "customer.subscription.deleted":
				await this.handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription,
					eventCreatedIso,
				);
				return;
			case "invoice.payment_failed":
				await this.handlePaymentFailed(event.data.object as Stripe.Invoice, eventCreatedIso);
				return;
			default:
				return;
		}
	}

	private async handleCheckoutCompleted(
		session: Stripe.Checkout.Session,
		eventCreatedIso: string,
		env: Bindings,
	) {
		const userId = session.client_reference_id;
		const stripeCustomerId =
			typeof session.customer === "string" ? session.customer : session.customer?.id;
		if (!userId || !stripeCustomerId) return;

		const stripeSubscriptionId =
			typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

		// Checkoutセッション完了は「決済フォームを提出した」ことしか示さず、サブスクリプションの
		// 現在の実際の状態(即時キャンセル等のレース、非同期決済手段による保留等)を保証しない。
		// Stripe APIから直接subscriptionを取得し、それを信頼源としてtier/statusを決める
		const stripe = createStripeClient(env);
		const subscription = stripeSubscriptionId
			? await stripe.subscriptions.retrieve(stripeSubscriptionId)
			: undefined;
		const priceId = subscription?.items.data[0]?.price.id;
		const mappedStatus = subscription ? mapStripeStatus(subscription.status) : "active";
		const currentPeriodEnd = subscription?.items.data[0]?.current_period_end
			? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
			: undefined;
		const cancelAtPeriodEnd = subscription && isScheduledToCancel(subscription) ? 1 : 0;

		const existing = await this.subscriptionRepo.findByUserId(userId);
		const tier = resolveTier(priceId, mappedStatus, existing?.tier ?? "free", env);

		if (existing) {
			if (isStaleEvent(eventCreatedIso, existing.lastEventCreatedAt)) return;
			await this.subscriptionRepo.updateByStripeCustomerId(stripeCustomerId, {
				stripeSubscriptionId,
				stripePriceId: priceId,
				tier,
				status: mappedStatus,
				currentPeriodEnd,
				cancelAtPeriodEnd,
				lastEventCreatedAt: eventCreatedIso,
			});
			return;
		}

		await this.subscriptionRepo.create({
			userId,
			stripeCustomerId,
			stripeSubscriptionId,
			stripePriceId: priceId,
			tier,
			status: mappedStatus,
			currentPeriodEnd,
			cancelAtPeriodEnd,
			lastEventCreatedAt: eventCreatedIso,
		});
	}

	private async handleSubscriptionUpdated(
		subscription: Stripe.Subscription,
		eventCreatedIso: string,
		env: Bindings,
	) {
		const stripeCustomerId =
			typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
		const priceId = subscription.items.data[0]?.price.id;
		const currentPeriodEnd = subscription.items.data[0]?.current_period_end
			? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
			: undefined;
		const mappedStatus = mapStripeStatus(subscription.status);
		const cancelAtPeriodEnd = isScheduledToCancel(subscription) ? 1 : 0;

		const existing = await this.subscriptionRepo.findByStripeCustomerId(stripeCustomerId);
		if (!existing) {
			// checkout.session.completedより先にこのイベントが届いた場合の防御的処理。
			// userIdが分からないためここでは新規作成できず、後続のcheckout完了時に作成される
			return;
		}
		if (isStaleEvent(eventCreatedIso, existing.lastEventCreatedAt)) return;

		const tier = resolveTier(priceId, mappedStatus, existing.tier, env);

		await this.subscriptionRepo.updateByStripeCustomerId(stripeCustomerId, {
			stripeSubscriptionId: subscription.id,
			stripePriceId: priceId,
			tier,
			status: mappedStatus,
			currentPeriodEnd,
			cancelAtPeriodEnd,
			lastEventCreatedAt: eventCreatedIso,
		});
	}

	private async handleSubscriptionDeleted(
		subscription: Stripe.Subscription,
		eventCreatedIso: string,
	) {
		const stripeCustomerId =
			typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

		const existing = await this.subscriptionRepo.findByStripeCustomerId(stripeCustomerId);
		if (!existing) {
			// checkout.session.completedより先にこのイベントが届いた場合の防御的処理。対応する
			// 行がまだ無いため更新できないが、後続のcheckout完了処理はStripe APIから実際の
			// subscription状態を取得して作成するため、既にキャンセル済みであれば正しく
			// status=canceled/tier=freeで作成される(handleCheckoutCompleted参照)
			return;
		}
		if (isStaleEvent(eventCreatedIso, existing.lastEventCreatedAt)) return;

		// customerIdは保持する(再課金・ポータルアクセスに備える)。tierのみfreeへ戻す
		await this.subscriptionRepo.updateByStripeCustomerId(stripeCustomerId, {
			tier: "free",
			status: "canceled",
			stripeSubscriptionId: null,
			stripePriceId: null,
			currentPeriodEnd: null,
			cancelAtPeriodEnd: 0,
			lastEventCreatedAt: eventCreatedIso,
		});
	}

	private async handlePaymentFailed(invoice: Stripe.Invoice, eventCreatedIso: string) {
		const stripeCustomerId =
			typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
		if (!stripeCustomerId) return;

		const existing = await this.subscriptionRepo.findByStripeCustomerId(stripeCustomerId);
		if (!existing) return;
		if (isStaleEvent(eventCreatedIso, existing.lastEventCreatedAt)) return;

		// tierは変更しない(グレース期間: Stripeの自動リトライと並行して即時ダウングレードしない)
		await this.subscriptionRepo.updateByStripeCustomerId(stripeCustomerId, {
			status: "past_due",
			lastEventCreatedAt: eventCreatedIso,
		});
	}
}
