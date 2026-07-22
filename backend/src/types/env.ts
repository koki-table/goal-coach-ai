export type Bindings = {
	DB: D1Database;
	CLERK_SECRET_KEY: string;
	CLERK_PUBLISHABLE_KEY: string;
	ALLOWED_ORIGINS: string;
	GEMINI_API_KEY?: string;
	AI_GATEWAY_ACCOUNT_ID?: string;
	AI_GATEWAY_NAME?: string;
};
