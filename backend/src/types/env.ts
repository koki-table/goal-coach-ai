export type Bindings = {
	DB: D1Database;
	CLERK_SECRET_KEY: string;
	CLERK_PUBLISHABLE_KEY: string;
	ALLOWED_ORIGINS: string;
	GEMINI_API_KEY?: string;
	AI_GATEWAY_ACCOUNT_ID?: string;
	AI_GATEWAY_NAME?: string;
	STRIPE_SECRET_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;
	STRIPE_PRICE_ID_MONTHLY?: string;
	STRIPE_PRICE_ID_YEARLY?: string;
	FRONTEND_URL?: string;
};
