import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubscriptionRepository } from "../../../common/repositories/subscriptionRepository";
import { createDb } from "../../../db";
import type { Bindings } from "../../../types/env";
import * as stripeClientModule from "../lib/stripeClient";
import { StripeWebhookService } from "./stripeWebhookService";

function createUnusedD1(): D1Database {
	const fail = (name: string) => () => {
		throw new Error(`unexpected D1 method call: ${name}`);
	};
	return {
		prepare: fail("prepare"),
		dump: fail("dump"),
		exec: fail("exec"),
		batch: fail("batch"),
		withSession: fail("withSession"),
	} as unknown as D1Database;
}

const env: Bindings = {
	DB: createUnusedD1(),
	CLERK_SECRET_KEY: "test",
	CLERK_PUBLISHABLE_KEY: "test",
	ALLOWED_ORIGINS: "",
	STRIPE_PRICE_ID_MONTHLY: "price_monthly",
	STRIPE_PRICE_ID_YEARLY: "price_yearly",
};

const EVENT_CREATED_UNIX = 1_700_000_000;
const EVENT_CREATED_ISO = new Date(EVENT_CREATED_UNIX * 1000).toISOString();

function makeSubscriptionEvent(
	overrides: Partial<{
		id: string;
		type: string;
		items: { price: { id: string }; current_period_end: number }[];
		status: string;
		customerId: string;
		created: number;
	}> = {},
) {
	return {
		id: overrides.id ?? "evt_1",
		type: overrides.type ?? "customer.subscription.updated",
		created: overrides.created ?? EVENT_CREATED_UNIX,
		data: {
			object: {
				id: "sub_1",
				customer: overrides.customerId ?? "cus_1",
				status: overrides.status ?? "active",
				items: {
					data: overrides.items ?? [
						{ price: { id: "price_monthly" }, current_period_end: 1_700_000_000 },
					],
				},
			},
		},
		// biome-ignore lint/suspicious/noExplicitAny: テスト用にStripe.Event型を簡略化する
	} as any;
}

function makeCheckoutEvent(
	overrides: Partial<{
		id: string;
		userId: string | null;
		customerId: string;
		subscriptionId: string;
		created: number;
	}> = {},
) {
	return {
		id: overrides.id ?? "evt_checkout",
		type: "checkout.session.completed",
		created: overrides.created ?? EVENT_CREATED_UNIX,
		data: {
			object: {
				client_reference_id: overrides.userId ?? "user-1",
				customer: overrides.customerId ?? "cus_1",
				subscription: overrides.subscriptionId ?? "sub_1",
			},
		},
		// biome-ignore lint/suspicious/noExplicitAny: テスト用にStripe.Event型を簡略化する
	} as any;
}

// handleCheckoutCompletedはStripe APIからsubscriptionを取得して信頼源とするため、
// createStripeClientをスパイしてsubscriptions.retrieveをモックする
function mockStripeSubscriptionRetrieve(subscription: {
	status: string;
	items: { data: { price: { id: string }; current_period_end: number }[] };
}) {
	vi.spyOn(stripeClientModule, "createStripeClient").mockReturnValue({
		subscriptions: {
			retrieve: vi.fn().mockResolvedValue(subscription),
		},
		// biome-ignore lint/suspicious/noExplicitAny: テスト用にStripeクライアント型を簡略化する
	} as any);
}

describe("StripeWebhookService", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe("checkout.session.completed", () => {
		it("creates a new row using the actual subscription status fetched from Stripe", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;

			vi.spyOn(repo, "findByUserId").mockResolvedValue(undefined);
			const createSpy = vi.spyOn(repo, "create").mockResolvedValue({} as never);
			mockStripeSubscriptionRetrieve({
				status: "active",
				items: { data: [{ price: { id: "price_monthly" }, current_period_end: 1_700_000_000 }] },
			});

			await service.handleEvent(makeCheckoutEvent(), env);

			expect(createSpy).toHaveBeenCalledWith({
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: "sub_1",
				stripePriceId: "price_monthly",
				tier: "pro",
				status: "active",
				currentPeriodEnd: new Date(1_700_000_000 * 1000).toISOString(),
				lastEventCreatedAt: EVENT_CREATED_ISO,
			});
		});

		it("does not grant pro tier if Stripe reports the subscription as already canceled (race with an instant cancel)", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;

			vi.spyOn(repo, "findByUserId").mockResolvedValue(undefined);
			const createSpy = vi.spyOn(repo, "create").mockResolvedValue({} as never);
			mockStripeSubscriptionRetrieve({
				status: "canceled",
				items: { data: [{ price: { id: "price_monthly" }, current_period_end: 1_700_000_000 }] },
			});

			await service.handleEvent(makeCheckoutEvent(), env);

			expect(createSpy).toHaveBeenCalledWith(
				expect.objectContaining({ tier: "free", status: "canceled" }),
			);
		});

		it("updates the existing row instead of creating a duplicate when a subscription already exists", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;

			vi.spyOn(repo, "findByUserId").mockResolvedValue({
				id: "sub-row-1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: null,
				stripePriceId: null,
				tier: "free",
				status: "canceled",
				currentPeriodEnd: null,
				lastEventCreatedAt: null,
				createdAt: "",
				updatedAt: "",
			});
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId").mockResolvedValue({} as never);
			mockStripeSubscriptionRetrieve({
				status: "active",
				items: { data: [{ price: { id: "price_monthly" }, current_period_end: 1_700_000_000 }] },
			});

			await service.handleEvent(makeCheckoutEvent({ subscriptionId: "sub_2" }), env);

			expect(updateSpy).toHaveBeenCalledWith("cus_1", {
				stripeSubscriptionId: "sub_2",
				stripePriceId: "price_monthly",
				tier: "pro",
				status: "active",
				currentPeriodEnd: new Date(1_700_000_000 * 1000).toISOString(),
				lastEventCreatedAt: EVENT_CREATED_ISO,
			});
		});

		it("ignores a stale event whose event.created is older than the last recorded event", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;

			vi.spyOn(repo, "findByUserId").mockResolvedValue({
				id: "sub-row-1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: "sub_1",
				stripePriceId: "price_monthly",
				tier: "pro",
				status: "active",
				currentPeriodEnd: null,
				lastEventCreatedAt: new Date(2_000_000_000 * 1000).toISOString(),
				createdAt: "",
				updatedAt: "",
			});
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId");
			mockStripeSubscriptionRetrieve({
				status: "active",
				items: { data: [{ price: { id: "price_monthly" }, current_period_end: 1_700_000_000 }] },
			});

			await service.handleEvent(makeCheckoutEvent({ created: 1_000_000_000 }), env);

			expect(updateSpy).not.toHaveBeenCalled();
		});
	});

	describe("customer.subscription.updated / created", () => {
		it("syncs tier/status/currentPeriodEnd from the subscription price and status", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;

			vi.spyOn(repo, "findByStripeCustomerId").mockResolvedValue({
				id: "sub-row-1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: "sub_1",
				stripePriceId: "price_monthly",
				tier: "pro",
				status: "active",
				currentPeriodEnd: null,
				lastEventCreatedAt: null,
				createdAt: "",
				updatedAt: "",
			});
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId").mockResolvedValue({} as never);

			const event = makeSubscriptionEvent({
				items: [{ price: { id: "price_yearly" }, current_period_end: 1_700_000_000 }],
				status: "active",
			});

			await service.handleEvent(event, env);

			expect(updateSpy).toHaveBeenCalledWith("cus_1", {
				stripeSubscriptionId: "sub_1",
				stripePriceId: "price_yearly",
				tier: "pro",
				status: "active",
				currentPeriodEnd: new Date(1_700_000_000 * 1000).toISOString(),
				lastEventCreatedAt: EVENT_CREATED_ISO,
			});
		});

		it("keeps the existing tier (does not silently free-ify) when the price id is not recognized but the subscription is still active", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;

			vi.spyOn(repo, "findByStripeCustomerId").mockResolvedValue({
				id: "sub-row-1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: "sub_1",
				stripePriceId: "price_unknown",
				tier: "pro",
				status: "active",
				currentPeriodEnd: null,
				lastEventCreatedAt: null,
				createdAt: "",
				updatedAt: "",
			});
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId").mockResolvedValue({} as never);

			const event = makeSubscriptionEvent({
				items: [{ price: { id: "price_unknown" }, current_period_end: 1_700_000_000 }],
				status: "active",
			});

			await service.handleEvent(event, env);

			expect(updateSpy).toHaveBeenCalledWith("cus_1", expect.objectContaining({ tier: "pro" }));
		});

		it("forces tier to free when status is a terminal non-active state, even if the price id still matches a paid price", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;

			vi.spyOn(repo, "findByStripeCustomerId").mockResolvedValue({
				id: "sub-row-1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: "sub_1",
				stripePriceId: "price_monthly",
				tier: "pro",
				status: "active",
				currentPeriodEnd: null,
				lastEventCreatedAt: null,
				createdAt: "",
				updatedAt: "",
			});
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId").mockResolvedValue({} as never);

			// unpaid: グレース期間(past_due)を経てStripe側が最終的にリトライを諦めた終端状態。
			// 価格IDは変わっていないが、statusが終端非アクティブならtierをfreeに落とす
			const event = makeSubscriptionEvent({
				items: [{ price: { id: "price_monthly" }, current_period_end: 1_700_000_000 }],
				status: "unpaid",
			});

			await service.handleEvent(event, env);

			expect(updateSpy).toHaveBeenCalledWith(
				"cus_1",
				expect.objectContaining({ tier: "free", status: "canceled" }),
			);
		});

		it("does not create a row when the subscription-update event arrives before checkout.session.completed", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;

			vi.spyOn(repo, "findByStripeCustomerId").mockResolvedValue(undefined);
			const createSpy = vi.spyOn(repo, "create");
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId");

			await service.handleEvent(makeSubscriptionEvent(), env);

			expect(createSpy).not.toHaveBeenCalled();
			expect(updateSpy).not.toHaveBeenCalled();
		});

		it("ignores a stale event whose event.created is older than the last recorded event", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;

			vi.spyOn(repo, "findByStripeCustomerId").mockResolvedValue({
				id: "sub-row-1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: "sub_1",
				stripePriceId: "price_monthly",
				tier: "pro",
				status: "active",
				currentPeriodEnd: null,
				lastEventCreatedAt: new Date(2_000_000_000 * 1000).toISOString(),
				createdAt: "",
				updatedAt: "",
			});
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId");

			await service.handleEvent(makeSubscriptionEvent({ created: 1_000_000_000 }), env);

			expect(updateSpy).not.toHaveBeenCalled();
		});
	});

	describe("customer.subscription.deleted", () => {
		it("resets tier to free and preserves the stripeCustomerId", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;
			vi.spyOn(repo, "findByStripeCustomerId").mockResolvedValue({
				id: "sub-row-1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: "sub_1",
				stripePriceId: "price_monthly",
				tier: "pro",
				status: "active",
				currentPeriodEnd: null,
				lastEventCreatedAt: null,
				createdAt: "",
				updatedAt: "",
			});
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId").mockResolvedValue({} as never);

			const event = makeSubscriptionEvent({ type: "customer.subscription.deleted" });

			await service.handleEvent(event, env);

			expect(updateSpy).toHaveBeenCalledWith("cus_1", {
				tier: "free",
				status: "canceled",
				stripeSubscriptionId: null,
				stripePriceId: null,
				currentPeriodEnd: null,
				lastEventCreatedAt: EVENT_CREATED_ISO,
			});
		});

		it("does nothing (no throw) when the .deleted event arrives before any row exists for the customer (race with checkout.session.completed)", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;
			vi.spyOn(repo, "findByStripeCustomerId").mockResolvedValue(undefined);
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId");

			const event = makeSubscriptionEvent({ type: "customer.subscription.deleted" });

			await expect(service.handleEvent(event, env)).resolves.not.toThrow();
			expect(updateSpy).not.toHaveBeenCalled();
		});
	});

	describe("invoice.payment_failed", () => {
		it("sets status to past_due without changing tier (grace period)", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;
			vi.spyOn(repo, "findByStripeCustomerId").mockResolvedValue({
				id: "sub-row-1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: "sub_1",
				stripePriceId: "price_monthly",
				tier: "pro",
				status: "active",
				currentPeriodEnd: null,
				lastEventCreatedAt: null,
				createdAt: "",
				updatedAt: "",
			});
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId").mockResolvedValue({} as never);

			const event = {
				id: "evt_invoice",
				type: "invoice.payment_failed",
				created: EVENT_CREATED_UNIX,
				data: { object: { customer: "cus_1" } },
				// biome-ignore lint/suspicious/noExplicitAny: テスト用にStripe.Event型を簡略化する
			} as any;

			await service.handleEvent(event, env);

			expect(updateSpy).toHaveBeenCalledWith("cus_1", {
				status: "past_due",
				lastEventCreatedAt: EVENT_CREATED_ISO,
			});
		});
	});
});
