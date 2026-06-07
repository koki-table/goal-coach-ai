import { Hono } from "hono";
import { GoalNotFoundError } from "../../../common/errors";
import {
	goalCreateSchema,
	goalUpdateSchema,
	milestoneCreateBatchSchema,
	todoCreateSchema,
	todoReorderSchema,
} from "../../../common/validators";
import { createDb } from "../../../db";
import type { Variables } from "../../../types/context";
import type { Bindings } from "../../../types/env";
import { MilestoneService } from "../../milestones/services/milestoneService";
import { TodoService } from "../../todos/services/todoService";
import { GoalService } from "../services/goalService";

export const goalsRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /goals
goalsRoute.get("/", async (c) => {
	const userId = c.get("dbUserId");
	const db = createDb(c.env.DB);
	const service = new GoalService(db);

	const goals = await service.getAll(userId);
	return c.json(goals);
});

// POST /goals
goalsRoute.post("/", async (c) => {
	const userId = c.get("dbUserId");
	const db = createDb(c.env.DB);
	const service = new GoalService(db);

	const parsed = goalCreateSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	const goal = await service.create(userId, parsed.data);
	return c.json(goal, 201);
});

// PUT /goals/:id
goalsRoute.put("/:id", async (c) => {
	const userId = c.get("dbUserId");
	const goalId = c.req.param("id");
	const db = createDb(c.env.DB);
	const service = new GoalService(db);

	const parsed = goalUpdateSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	try {
		const goal = await service.update(userId, goalId, parsed.data);
		return c.json(goal);
	} catch (e) {
		if (e instanceof GoalNotFoundError) {
			return c.json({ message: "Goal not found" }, 404);
		}
		throw e;
	}
});

// DELETE /goals/:id
goalsRoute.delete("/:id", async (c) => {
	const userId = c.get("dbUserId");
	const goalId = c.req.param("id");
	const db = createDb(c.env.DB);
	const service = new GoalService(db);

	try {
		await service.delete(userId, goalId);
		return c.json({ message: "Deleted" });
	} catch (e) {
		if (e instanceof GoalNotFoundError) {
			return c.json({ message: "Goal not found" }, 404);
		}
		throw e;
	}
});

// GET /goals/:goalId/milestones
goalsRoute.get("/:goalId/milestones", async (c) => {
	const userId = c.get("dbUserId");
	const goalId = c.req.param("goalId");
	const db = createDb(c.env.DB);
	const service = new MilestoneService(db);

	try {
		const milestones = await service.getByGoalId(userId, goalId);
		return c.json(milestones);
	} catch (e) {
		if (e instanceof GoalNotFoundError) {
			return c.json({ message: "Goal not found" }, 404);
		}
		throw e;
	}
});

// PUT /goals/:goalId/milestones (replace all milestones for a goal)
goalsRoute.put("/:goalId/milestones", async (c) => {
	const userId = c.get("dbUserId");
	const goalId = c.req.param("goalId");
	const db = createDb(c.env.DB);
	const service = new MilestoneService(db);

	const parsed = milestoneCreateBatchSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	try {
		const milestones = await service.createBatch(userId, goalId, parsed.data);
		return c.json(milestones);
	} catch (e) {
		if (e instanceof GoalNotFoundError) {
			return c.json({ message: "Goal not found" }, 404);
		}
		throw e;
	}
});

// GET /goals/:goalId/todos
goalsRoute.get("/:goalId/todos", async (c) => {
	const userId = c.get("dbUserId");
	const goalId = c.req.param("goalId");
	const db = createDb(c.env.DB);
	const service = new TodoService(db);

	try {
		const todos = await service.getByGoalId(userId, goalId);
		return c.json(todos);
	} catch (e) {
		if (e instanceof GoalNotFoundError) {
			return c.json({ message: "Goal not found" }, 404);
		}
		throw e;
	}
});

// POST /goals/:goalId/todos
goalsRoute.post("/:goalId/todos", async (c) => {
	const userId = c.get("dbUserId");
	const goalId = c.req.param("goalId");
	const db = createDb(c.env.DB);
	const service = new TodoService(db);

	const parsed = todoCreateSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	try {
		const todo = await service.create(userId, goalId, parsed.data);
		return c.json(todo, 201);
	} catch (e) {
		if (e instanceof GoalNotFoundError) {
			return c.json({ message: "Goal not found" }, 404);
		}
		throw e;
	}
});

// PATCH /goals/:goalId/todos/reorder
goalsRoute.patch("/:goalId/todos/reorder", async (c) => {
	const userId = c.get("dbUserId");
	const goalId = c.req.param("goalId");
	const db = createDb(c.env.DB);
	const service = new TodoService(db);

	const parsed = todoReorderSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	try {
		await service.reorder(userId, goalId, parsed.data);
		return c.json({ message: "OK" });
	} catch (e) {
		if (e instanceof GoalNotFoundError) {
			return c.json({ message: "Goal not found" }, 404);
		}
		throw e;
	}
});
