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
	const eventRepo = new ProcessedStripeEventRepository(db);

	// 既処理イベントは即200で終える(重複配信の高速スキップ)。ただしこのチェックと
	// 直後のhandleEvent実行の間には僅かなレース窓があるため、handleEvent自体は
	// stripeCustomerIdをキーにしたupsert的な書き込みで冪等に作られている前提。
	if (await eventRepo.isProcessed(event.id)) {
		return c.json({ received: true });
	}

	// 処理が成功した後にのみ既処理マークを書き込む。handleEventが例外を投げた場合は
	// マークが残らず、Stripeの再送で再処理できる(処理失敗を「重複」と誤魔化さない)
	await new StripeWebhookService(db).handleEvent(event, c.env);
	await eventRepo.markProcessed(event.id, event.type);

	return c.json({ received: true });
});
