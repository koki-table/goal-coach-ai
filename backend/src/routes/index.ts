import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import type { Variables } from "../types/context";
import type { Bindings } from "../types/env";
import { goals } from "./goals";
import { health } from "./health";

const routes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Public routes
routes.route("/health", health);

// Protected routes (auth required)
const protectedRoutes = new Hono<{
	Bindings: Bindings;
	Variables: Variables;
}>();
protectedRoutes.use("*", authMiddleware);
protectedRoutes.route("/goals", goals);

routes.route("/", protectedRoutes);

export { routes };
