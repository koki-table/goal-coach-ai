import { Hono } from "hono";
import { BillingNotConfiguredError, NoStripeCustomerError } from "../../../common/errors";
import { billingCheckoutSchema } from "../../../common/validators";
import { createDb } from "../../../db";
import type { Variables } from "../../../types/context";
import type { Bindings } from "../../../types/env";
import { BillingService } from "../services/billingService";

export const billingRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /billing/checkout
billingRoute.post("/checkout", async (c) => {
	const userId = c.get("dbUserId");
	const db = createDb(c.env.DB);
	const service = new BillingService(db);

	const parsed = billingCheckoutSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	try {
		const result = await service.createCheckoutSession(userId, parsed.data.interval, c.env);
		return c.json(result);
	} catch (e) {
		if (e instanceof BillingNotConfiguredError) {
			return c.json({ message: "Billing is not configured" }, 503);
		}
		throw e;
	}
});

// POST /billing/portal
billingRoute.post("/portal", async (c) => {
	const userId = c.get("dbUserId");
	const db = createDb(c.env.DB);
	const service = new BillingService(db);

	try {
		const result = await service.createPortalSession(userId, c.env);
		return c.json(result);
	} catch (e) {
		if (e instanceof NoStripeCustomerError) {
			return c.json({ message: "No Stripe customer found" }, 404);
		}
		if (e instanceof BillingNotConfiguredError) {
			return c.json({ message: "Billing is not configured" }, 503);
		}
		throw e;
	}
});

// GET /billing/status
billingRoute.get("/status", async (c) => {
	const userId = c.get("dbUserId");
	const db = createDb(c.env.DB);
	const service = new BillingService(db);

	const status = await service.getStatus(userId, {
		monthly: c.env.STRIPE_PRICE_ID_MONTHLY,
		yearly: c.env.STRIPE_PRICE_ID_YEARLY,
	});
	return c.json(status);
});
