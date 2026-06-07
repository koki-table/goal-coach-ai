import { Hono } from "hono";
import { goalsRoute } from "../features/goals/routes/goalsRoute";
import { milestonesRoute } from "../features/milestones/routes/milestonesRoute";
import { todosRoute } from "../features/todos/routes/todosRoute";
import { authMiddleware } from "../middleware/auth";
import type { Variables } from "../types/context";
import type { Bindings } from "../types/env";
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

// Goals CRUD + nested milestones/todos
protectedRoutes.route("/goals", goalsRoute);

// Top-level milestones routes (/milestones/all, /milestones/:id)
protectedRoutes.route("/milestones", milestonesRoute);

// Top-level todos routes (/todos, /todos/:id, /todos/:id/toggle)
protectedRoutes.route("/todos", todosRoute);

routes.route("/", protectedRoutes);

export { routes };
