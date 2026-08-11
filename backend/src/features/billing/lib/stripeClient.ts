import Stripe from "stripe";
import { BillingNotConfiguredError } from "../../../common/errors";
import type { Bindings } from "../../../types/env";

// Cloudflare Workersランタイムでは fetch-based HTTP client を使う必要がある
// (Node httpモジュールに依存する既定のHTTPクライアントは動かない)
export function createStripeClient(env: Bindings): Stripe {
	if (!env.STRIPE_SECRET_KEY) {
		throw new BillingNotConfiguredError();
	}
	return new Stripe(env.STRIPE_SECRET_KEY, {
		httpClient: Stripe.createFetchHttpClient(),
	});
}
