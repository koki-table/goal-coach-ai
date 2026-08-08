import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachMessageRepository } from "../../../common/repositories/coachMessageRepository";
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
	const messageRepo = (gate as unknown as { messageRepo: CoachMessageRepository }).messageRepo;
	return { gate, subscriptionRepo, messageRepo };
}

describe("CoachChatGate", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe("resolveForDecidedMessage", () => {
		it.each([0, 1, 2])(
			"does not block a free tier user with %i decided messages today",
			async (count) => {
				const { gate, subscriptionRepo, messageRepo } = buildGate();
				vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue({
					id: "s1",
					userId: "user-1",
					stripeCustomerId: "cus_1",
					stripeSubscriptionId: null,
					stripePriceId: null,
					tier: "free",
					status: "active",
					currentPeriodEnd: null,
					createdAt: "",
					updatedAt: "",
				});
				vi.spyOn(messageRepo, "countUserMessagesByUserIdSince").mockResolvedValue(count);

				const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01T00:00:00.000Z");

				expect(result).toEqual({ modelId: COACH_MODEL_FREE, blocked: false });
			},
		);

		it.each([3, 4])("blocks a free tier user at the %ith decided message today", async (count) => {
			const { gate, subscriptionRepo, messageRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue({
				id: "s1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: null,
				stripePriceId: null,
				tier: "free",
				status: "active",
				currentPeriodEnd: null,
				createdAt: "",
				updatedAt: "",
			});
			vi.spyOn(messageRepo, "countUserMessagesByUserIdSince").mockResolvedValue(count);

			const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01T00:00:00.000Z");

			expect(result).toEqual({ modelId: COACH_MODEL_FREE, blocked: true });
		});

		it("treats a user with no subscription row as free tier", async () => {
			const { gate, subscriptionRepo, messageRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(undefined);
			vi.spyOn(messageRepo, "countUserMessagesByUserIdSince").mockResolvedValue(3);

			const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01T00:00:00.000Z");

			expect(result).toEqual({ modelId: COACH_MODEL_FREE, blocked: true });
		});

		it.each([0, 99])(
			"uses the pro model without blocking at %i decided messages today",
			async (count) => {
				const { gate, subscriptionRepo, messageRepo } = buildGate();
				vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue({
					id: "s1",
					userId: "user-1",
					stripeCustomerId: "cus_1",
					stripeSubscriptionId: "sub_1",
					stripePriceId: "price_1",
					tier: "pro",
					status: "active",
					currentPeriodEnd: null,
					createdAt: "",
					updatedAt: "",
				});
				vi.spyOn(messageRepo, "countUserMessagesByUserIdSince").mockResolvedValue(count);

				const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01T00:00:00.000Z");

				expect(result).toEqual({ modelId: COACH_MODEL_PRO, blocked: false });
			},
		);

		it.each([100, 150])(
			"downgrades to the free model without blocking at %i decided messages today (soft limit)",
			async (count) => {
				const { gate, subscriptionRepo, messageRepo } = buildGate();
				vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue({
					id: "s1",
					userId: "user-1",
					stripeCustomerId: "cus_1",
					stripeSubscriptionId: "sub_1",
					stripePriceId: "price_1",
					tier: "pro",
					status: "active",
					currentPeriodEnd: null,
					createdAt: "",
					updatedAt: "",
				});
				vi.spyOn(messageRepo, "countUserMessagesByUserIdSince").mockResolvedValue(count);

				const result = await gate.resolveForDecidedMessage("user-1", "2026-01-01T00:00:00.000Z");

				expect(result).toEqual({ modelId: COACH_MODEL_FREE, blocked: false });
			},
		);
	});

	describe("resolveForUndecidedMessage", () => {
		it("does not count messages and returns the free model for a free tier user", async () => {
			const { gate, subscriptionRepo, messageRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue({
				id: "s1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: null,
				stripePriceId: null,
				tier: "free",
				status: "active",
				currentPeriodEnd: null,
				createdAt: "",
				updatedAt: "",
			});
			const countSpy = vi.spyOn(messageRepo, "countUserMessagesByUserIdSince");

			const modelId = await gate.resolveForUndecidedMessage("user-1");

			expect(modelId).toBe(COACH_MODEL_FREE);
			expect(countSpy).not.toHaveBeenCalled();
		});

		it("does not count messages and returns the pro model for a pro tier user", async () => {
			const { gate, subscriptionRepo, messageRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue({
				id: "s1",
				userId: "user-1",
				stripeCustomerId: "cus_1",
				stripeSubscriptionId: "sub_1",
				stripePriceId: "price_1",
				tier: "pro",
				status: "active",
				currentPeriodEnd: null,
				createdAt: "",
				updatedAt: "",
			});
			const countSpy = vi.spyOn(messageRepo, "countUserMessagesByUserIdSince");

			const modelId = await gate.resolveForUndecidedMessage("user-1");

			expect(modelId).toBe(COACH_MODEL_PRO);
			expect(countSpy).not.toHaveBeenCalled();
		});

		it("treats a user with no subscription row as free tier", async () => {
			const { gate, subscriptionRepo } = buildGate();
			vi.spyOn(subscriptionRepo, "findByUserId").mockResolvedValue(undefined);

			const modelId = await gate.resolveForUndecidedMessage("user-1");

			expect(modelId).toBe(COACH_MODEL_FREE);
		});
	});
});
