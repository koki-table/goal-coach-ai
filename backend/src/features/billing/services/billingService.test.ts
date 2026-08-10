import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachDailyUsageRepository } from "../../../common/repositories/coachDailyUsageRepository";
import type { SubscriptionRepository } from "../../../common/repositories/subscriptionRepository";
import { createDb } from "../../../db";
import { BillingService } from "./billingService";

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

const priceIds = { monthly: "price_monthly", yearly: "price_yearly" };

function buildService() {
	const db = createDb(createUnusedD1());
	const service = new BillingService(db);
	const subscriptionRepo = (service as unknown as { subscriptionRepo: SubscriptionRepository })
		.subscriptionRepo;
	const usageRepo = (service as unknown as { usageRepo: CoachDailyUsageRepository }).usageRepo;
	return { service, subscriptionRepo, usageRepo };
}

function subscriptionRow(
	overrides: Partial<{ stripePriceId: string | null; tier: "free" | "pro" }>,
) {
	return {
		id: "s1",
		userId: "user-1",
		stripeCustomerId: "cus_1",
		stripeSubscriptionId: "sub_1",
		stripePriceId: overrides.stripePriceId ?? null,
		tier: overrides.tier ?? "pro",
		status: "active" as const,
		currentPeriodEnd: null,
		lastEventCreatedAt: null,
		createdAt: "",
		updatedAt: "",
	};
}

describe("BillingService.getStatus", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("returns interval='monthly' when stripePriceId matches the monthly price", async () => {
		const { service, subscriptionRepo, usageRepo } = buildService();
		vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(
			subscriptionRow({ stripePriceId: "price_monthly" }),
		);
		vi.spyOn(usageRepo, "getCount").mockResolvedValue(0);

		const status = await service.getStatus("user-1", priceIds);

		expect(status.interval).toBe("monthly");
	});

	it("returns interval='yearly' when stripePriceId matches the yearly price", async () => {
		const { service, subscriptionRepo, usageRepo } = buildService();
		vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(
			subscriptionRow({ stripePriceId: "price_yearly" }),
		);
		vi.spyOn(usageRepo, "getCount").mockResolvedValue(0);

		const status = await service.getStatus("user-1", priceIds);

		expect(status.interval).toBe("yearly");
	});

	it("returns interval=undefined for a free tier user with no subscription row", async () => {
		const { service, subscriptionRepo, usageRepo } = buildService();
		vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(undefined);
		vi.spyOn(usageRepo, "getCount").mockResolvedValue(0);

		const status = await service.getStatus("user-1", priceIds);

		expect(status.interval).toBeUndefined();
		expect(status.tier).toBe("free");
	});

	it("returns interval=undefined when stripePriceId does not match either configured price", async () => {
		const { service, subscriptionRepo, usageRepo } = buildService();
		vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(
			subscriptionRow({ stripePriceId: "price_unknown" }),
		);
		vi.spyOn(usageRepo, "getCount").mockResolvedValue(0);

		const status = await service.getStatus("user-1", priceIds);

		expect(status.interval).toBeUndefined();
	});
});
