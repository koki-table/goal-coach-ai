import { Hono } from "hono";
import type { Variables } from "../types/context";
import type { Bindings } from "../types/env";

const health = new Hono<{ Bindings: Bindings; Variables: Variables }>();

health.get("/", (c) => {
	return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { health };
