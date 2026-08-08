import { Hono } from "hono";
import { billingRoute } from "../features/billing/routes/billingRoute";
import { billingWebhookRoute } from "../features/billing/routes/billingWebhookRoute";
import { coachRoute } from "../features/coach/routes/coachRoute";
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
// Stripe Webhook: ClerkのJWT認証を持たないため公開ルートに置く(署名検証はルート内で行う)
routes.route("/webhooks/stripe", billingWebhookRoute);

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

// AIコーチとのチャット (/coach/conversations, /coach/messages/:id/adopt-plan-item)
protectedRoutes.route("/coach", coachRoute);

// 課金(Stripe Checkout/Customer Portalセッション作成、現在の契約状況取得)
protectedRoutes.route("/billing", billingRoute);

routes.route("/", protectedRoutes);

export { routes };
