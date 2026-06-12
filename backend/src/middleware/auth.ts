import { verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { createDb } from "../db";
import { users } from "../db/schema";
import type { Variables } from "../types/context";
import type { Bindings } from "../types/env";

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

export async function authMiddleware(c: AppContext, next: Next) {
	const authHeader = c.req.header("Authorization");
	if (!authHeader) {
		return c.json({ message: "Authorization header is required" }, 401);
	}

	if (!authHeader.startsWith("Bearer ")) {
		return c.json({ message: "Invalid authorization format" }, 401);
	}

	const token = authHeader.slice(7);

	let authId: string;
	try {
		const payload = await verifyToken(token, {
			secretKey: c.env.CLERK_SECRET_KEY,
		});
		authId = payload.sub;
	} catch (err) {
		console.error("[auth] verifyToken failed:", err);
		const message =
			err instanceof Error && err.message.includes("expired") ? "Token expired" : "Invalid token";
		return c.json({ message }, 401);
	}

	c.set("authId", authId);

	const db = createDb(c.env.DB);
	const dbUserId = await upsertUser(db, authId);
	c.set("dbUserId", dbUserId);

	await next();
}

async function upsertUser(db: ReturnType<typeof createDb>, authId: string): Promise<string> {
	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.authId, authId))
		.get();

	if (existing) {
		return existing.id;
	}

	const id = crypto.randomUUID();
	await db.insert(users).values({ id, authId });
	return id;
}
