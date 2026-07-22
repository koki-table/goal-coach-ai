import { Hono } from "hono";
import {
	CoachNotConfiguredError,
	CoachRateLimitError,
	GoalNotFoundError,
} from "../../../common/errors";
import { coachEvaluateSchema } from "../../../common/validators";
import { createDb } from "../../../db";
import type { Variables } from "../../../types/context";
import type { Bindings } from "../../../types/env";
import { CoachService } from "../services/coachService";

export const coachRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// POST /coach/evaluate
coachRoute.post("/evaluate", async (c) => {
	const userId = c.get("dbUserId");
	const db = createDb(c.env.DB);
	const service = new CoachService(db);

	const parsed = coachEvaluateSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	try {
		const evaluation = await service.evaluateGoal(userId, parsed.data, c.env);
		return c.json(evaluation);
	} catch (e) {
		if (e instanceof GoalNotFoundError) {
			return c.json({ message: "Goal not found" }, 404);
		}
		if (e instanceof CoachRateLimitError) {
			return c.json({ message: "Rate limit exceeded" }, 429);
		}
		if (e instanceof CoachNotConfiguredError) {
			return c.json({ message: "Coach evaluation is not configured" }, 503);
		}
		throw e;
	}
});
