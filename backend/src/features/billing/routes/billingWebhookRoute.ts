import { Hono } from "hono";
import Stripe from "stripe";
import { ProcessedStripeEventRepository } from "../../../common/repositories/processedStripeEventRepository";
import { createDb } from "../../../db";
import type { Bindings } from "../../../types/env";
import { createStripeClient } from "../lib/stripeClient";
import { StripeWebhookService } from "../services/stripeWebhookService";

export const billingWebhookRoute = new Hono<{ Bindings: Bindings }>();

billingWebhookRoute.post("/", async (c) => {
	const signature = c.req.header("stripe-signature");
	if (!signature) {
		return c.json({ message: "Missing stripe-signature header" }, 400);
	}
	if (!c.env.STRIPE_WEBHOOK_SECRET) {
		return c.json({ message: "Billing is not configured" }, 503);
	}

	// 署名検証には生ボディの文字列が必須。c.req.json()を先に呼ぶとボディが消費され
	// 署名と不一致になるため、必ずc.req.text()で取得する
	const rawBody = await c.req.text();
	const stripe = createStripeClient(c.env);

	let event: Stripe.Event;
	try {
		event = await stripe.webhooks.constructEventAsync(
			rawBody,
			signature,
			c.env.STRIPE_WEBHOOK_SECRET,
			undefined,
			Stripe.createSubtleCryptoProvider(),
		);
	} catch {
		return c.json({ message: "Invalid signature" }, 400);
	}

	const db = createDb(c.env.DB);
	const isNewEvent = await new ProcessedStripeEventRepository(db).markProcessed(
		event.id,
		event.type,
	);
	if (!isNewEvent) {
		return c.json({ received: true });
	}

	await new StripeWebhookService(db).handleEvent(event, c.env);
	return c.json({ received: true });
});
