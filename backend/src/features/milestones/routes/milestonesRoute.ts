import { Hono } from "hono";
import { GoalNotFoundError, MilestoneNotFoundError } from "../../../common/errors";
import { milestoneUpdateSchema } from "../../../common/validators";
import { createDb } from "../../../db";
import type { Variables } from "../../../types/context";
import type { Bindings } from "../../../types/env";
import { MilestoneService } from "../services/milestoneService";

export const milestonesRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/milestones/all - all milestones grouped by goal
milestonesRoute.get("/all", async (c) => {
	const userId = c.get("dbUserId");
	const db = createDb(c.env.DB);
	const service = new MilestoneService(db);

	const grouped = await service.getAllGroupedByGoal(userId);
	return c.json(grouped);
});

// PATCH /api/milestones/:id - update a milestone
milestonesRoute.patch("/:id", async (c) => {
	const userId = c.get("dbUserId");
	const milestoneId = c.req.param("id");
	const db = createDb(c.env.DB);
	const service = new MilestoneService(db);

	const parsed = milestoneUpdateSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	try {
		const milestone = await service.update(userId, milestoneId, parsed.data);
		return c.json(milestone);
	} catch (e) {
		if (e instanceof MilestoneNotFoundError || e instanceof GoalNotFoundError) {
			return c.json({ message: "Not found" }, 404);
		}
		throw e;
	}
});
