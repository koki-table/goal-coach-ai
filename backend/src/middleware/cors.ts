import { cors } from "hono/cors";

export function corsMiddleware(allowedOrigins: string) {
	const origins = allowedOrigins
		? allowedOrigins
				.split(",")
				.map((o) => o.trim())
				.filter(Boolean)
		: [];

	return cors({
		origin: origins,
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		maxAge: 86400,
	});
}
