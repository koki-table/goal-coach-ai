import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachDailyUsageRepository } from "../../../common/repositories/coachDailyUsageRepository";
import type { SubscriptionRepository } from "../../../common/repositories/subscriptionRepository";
import { createDb } from "../../../db";
import { COACH_MODEL_FREE, COACH_MODEL_PRO } from "../config/coachModelConfig";
import { CoachChatGate } from "./coachChatGate";

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

function buildGate() {
	const db = createDb(createUnusedD1());
	const gate = new CoachChatGate(db);
	const subscriptionRepo = (gate as unknown as { subscriptionRepo: SubscriptionRepository })
		.subscriptionRepo;
	const usageRepo = (gate as unknown as { usageRepo: CoachDailyUsageRepository }).usageRepo;
	return { gate, subscriptionRepo, usageRepo };
}

function subscriptionRow(tier: "free" | "pro") {
	return {
		id: "s1",
		userId: "user-1",
		stripeCustomerId: "cus_1",
		stripeSubscriptionId: tier === "pro" ? "sub_1" : null,
		stripePriceId: tier === "pro" ? "price_1" : null,
		tier,
		status: "active" as const,
		currentPeriodEnd: null,
		cancelAtPeriodEnd: 0,
		lastEventCreatedAt: null,
		createdAt: "",
		updatedAt: "",
	};
}

describe("CoachChatGate", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe("resolveForDecidedMessage", () => {
		it.each([1, 2, 3])(
			"does not block a free tier user when the atomic increment returns %i (under the limit of 3)",
			async (newCount) => {
				const { gate, subscriptionRepo, usageRepo } = buildGate();
				vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(subscriptionRow("free"));
				const incrementSpy = vi
					.spyOn(usageRepo, "incrementIfUnderLimit")
					.mockResolvedValue(newCount);

				const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01");

				expect(result).toEqual({ modelId: COACH_MODEL_FREE, blocked: false });
				expect(incrementSpy).toHaveBeenCalledWith("user-1", "2026-01-01", 3);
			},
		);

		it("blocks a free tier user when the atomic increment is a no-op (limit already reached)", async () => {
			const { gate, subscriptionRepo, usageRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(subscriptionRow("free"));
			vi.spyOn(usageRepo, "incrementIfUnderLimit").mockResolvedValue(undefined);

			const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01");

			expect(result).toEqual({ modelId: COACH_MODEL_FREE, blocked: true });
		});

		it("treats a user with no subscription row as free tier", async () => {
			const { gate, subscriptionRepo, usageRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(undefined);
			const incrementSpy = vi
				.spyOn(usageRepo, "incrementIfUnderLimit")
				.mockResolvedValue(undefined);

			const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01");

			expect(result).toEqual({ modelId: COACH_MODEL_FREE, blocked: true });
			expect(incrementSpy).toHaveBeenCalledWith("user-1", "2026-01-01", 3);
		});

		it.each([1, 99, 100])(
			"uses the pro model without blocking when the unconditional increment returns %i (at or below the soft limit)",
			async (newCount) => {
				const { gate, subscriptionRepo, usageRepo } = buildGate();
				vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(subscriptionRow("pro"));
				const incrementSpy = vi.spyOn(usageRepo, "increment").mockResolvedValue(newCount);

				const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01");

				expect(result).toEqual({ modelId: COACH_MODEL_PRO, blocked: false });
				expect(incrementSpy).toHaveBeenCalledWith("user-1", "2026-01-01");
			},
		);

		it.each([101, 150])(
			"downgrades to the free model without blocking once the increment exceeds the soft limit at %i",
			async (newCount) => {
				const { gate, subscriptionRepo, usageRepo } = buildGate();
				vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(subscriptionRow("pro"));
				vi.spyOn(usageRepo, "increment").mockResolvedValue(newCount);

				const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01");

				expect(result).toEqual({ modelId: COACH_MODEL_FREE, blocked: false });
			},
		);

		it("never blocks a pro tier user regardless of count", async () => {
			const { gate, subscriptionRepo, usageRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(subscriptionRow("pro"));
			vi.spyOn(usageRepo, "increment").mockResolvedValue(10_000);

			const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01");

			expect(result.blocked).toBe(false);
		});
	});

	describe("resolveForUndecidedMessage", () => {
		it("does not touch the usage counter and returns the free model for a free tier user", async () => {
			const { gate, subscriptionRepo, usageRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(subscriptionRow("free"));
			const incrementSpy = vi.spyOn(usageRepo, "incrementIfUnderLimit");
			const unconditionalIncrementSpy = vi.spyOn(usageRepo, "increment");

			const modelId = await gate.resolveForUndecidedMessage("user-1");

			expect(modelId).toBe(COACH_MODEL_FREE);
			expect(incrementSpy).not.toHaveBeenCalled();
			expect(unconditionalIncrementSpy).not.toHaveBeenCalled();
		});

		it("does not touch the usage counter and returns the pro model for a pro tier user", async () => {
			const { gate, subscriptionRepo, usageRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(subscriptionRow("pro"));
			const incrementSpy = vi.spyOn(usageRepo, "increment");

			const modelId = await gate.resolveForUndecidedMessage("user-1");

			expect(modelId).toBe(COACH_MODEL_PRO);
			expect(incrementSpy).not.toHaveBeenCalled();
		});

		it("treats a user with no subscription row as free tier", async () => {
			const { gate, subscriptionRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(undefined);

			const modelId = await gate.resolveForUndecidedMessage("user-1");

			expect(modelId).toBe(COACH_MODEL_FREE);
		});
	});

	describe("releaseDecidedMessageReservation", () => {
		it("delegates to the usage repository's decrement", async () => {
			const { gate, usageRepo } = buildGate();
			const decrementSpy = vi.spyOn(usageRepo, "decrement").mockResolvedValue(undefined);

			await gate.releaseDecidedMessageReservation("user-1", "2026-01-01");

			expect(decrementSpy).toHaveBeenCalledWith("user-1", "2026-01-01");
		});
	});
});
