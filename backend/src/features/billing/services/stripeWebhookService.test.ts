import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubscriptionRepository } from "../../../common/repositories/subscriptionRepository";
import { createDb } from "../../../db";
import type { Bindings } from "../../../types/env";
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

function makeSubscriptionEvent(
	overrides: Partial<{
		id: string;
		type: string;
		items: { price: { id: string }; current_period_end: number }[];
		status: string;
		customerId: string;
	}> = {},
) {
	return {
		id: overrides.id ?? "evt_1",
		type: overrides.type ?? "customer.subscription.updated",
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

describe("StripeWebhookService", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe("checkout.session.completed", () => {
		it("creates a new row when no subscription exists for the user", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;

			vi.spyOn(repo, "findByUserId").mockResolvedValue(undefined);
			const createSpy = vi.spyOn(repo, "create").mockResolvedValue({} as never);

			const event = {
				id: "evt_checkout",
				type: "checkout.session.completed",
				data: {
					object: {
						client_reference_id: "user-1",
						customer: "cus_1",
						subscription: "sub_1",
					},
				},
				// biome-ignore lint/suspicious/noExplicitAny: テスト用にStripe.Event型を簡略化する
			} as any;

			await service.handleEvent(event, env);

			expect(createSpy).toHaveBeenCalledWith({
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: "sub_1",
				tier: "pro",
				status: "active",
			});
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
				createdAt: "",
				updatedAt: "",
			});
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId").mockResolvedValue({} as never);

			const event = {
				id: "evt_checkout_2",
				type: "checkout.session.completed",
				data: {
					object: { client_reference_id: "user-1", customer: "cus_1", subscription: "sub_2" },
				},
				// biome-ignore lint/suspicious/noExplicitAny: テスト用にStripe.Event型を簡略化する
			} as any;

			await service.handleEvent(event, env);

			expect(updateSpy).toHaveBeenCalledWith("cus_1", {
				stripeSubscriptionId: "sub_2",
				tier: "pro",
				status: "active",
			});
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
			});
		});

		it("falls back to free tier when the price id is not recognized", async () => {
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
				createdAt: "",
				updatedAt: "",
			});
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId").mockResolvedValue({} as never);

			const event = makeSubscriptionEvent({
				items: [{ price: { id: "price_unknown" }, current_period_end: 1_700_000_000 }],
			});

			await service.handleEvent(event, env);

			expect(updateSpy).toHaveBeenCalledWith("cus_1", expect.objectContaining({ tier: "free" }));
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
	});

	describe("customer.subscription.deleted", () => {
		it("resets tier to free and preserves the stripeCustomerId", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId").mockResolvedValue({} as never);

			const event = makeSubscriptionEvent({ type: "customer.subscription.deleted" });

			await service.handleEvent(event, env);

			expect(updateSpy).toHaveBeenCalledWith("cus_1", {
				tier: "free",
				status: "canceled",
				stripeSubscriptionId: null,
				stripePriceId: null,
				currentPeriodEnd: null,
			});
		});
	});

	describe("invoice.payment_failed", () => {
		it("sets status to past_due without changing tier (grace period)", async () => {
			const db = createDb(createUnusedD1());
			const service = new StripeWebhookService(db);
			const repo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
				.subscriptionRepo;
			const updateSpy = vi.spyOn(repo, "updateByStripeCustomerId").mockResolvedValue({} as never);

			const event = {
				id: "evt_invoice",
				type: "invoice.payment_failed",
				data: { object: { customer: "cus_1" } },
				// biome-ignore lint/suspicious/noExplicitAny: テスト用にStripe.Event型を簡略化する
			} as any;

			await service.handleEvent(event, env);

			expect(updateSpy).toHaveBeenCalledWith("cus_1", { status: "past_due" });
		});
	});
});
