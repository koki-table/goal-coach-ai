import { Hono } from "hono";
import type { Variables } from "../types/context";
import type { Bindings } from "../types/env";

const goals = new Hono<{ Bindings: Bindings; Variables: Variables }>();

goals.get("/", (c) => {
	return c.json([]);
});

export { goals };
