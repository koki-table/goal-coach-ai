import { Hono } from "hono";
import { GoalNotFoundError, TodoNotFoundError } from "../../../common/errors";
import { todoUpdateSchema } from "../../../common/validators";
import { createDb } from "../../../db";
import type { Variables } from "../../../types/context";
import type { Bindings } from "../../../types/env";
import { TodoService } from "../services/todoService";

export const todosRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /api/todos - all todos grouped by goal
todosRoute.get("/", async (c) => {
	const userId = c.get("dbUserId");
	const db = createDb(c.env.DB);
	const service = new TodoService(db);

	const grouped = await service.getAllByUser(userId);
	return c.json(grouped);
});

// PATCH /api/todos/:id - update a todo
todosRoute.patch("/:id", async (c) => {
	const userId = c.get("dbUserId");
	const todoId = c.req.param("id");
	const db = createDb(c.env.DB);
	const service = new TodoService(db);

	const parsed = todoUpdateSchema.safeParse(await c.req.json());
	if (!parsed.success) {
		return c.json({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }, 400);
	}

	try {
		const todo = await service.update(userId, todoId, parsed.data);
		return c.json(todo);
	} catch (e) {
		if (e instanceof TodoNotFoundError || e instanceof GoalNotFoundError) {
			return c.json({ message: "Not found" }, 404);
		}
		throw e;
	}
});

// DELETE /api/todos/:id - delete a todo
todosRoute.delete("/:id", async (c) => {
	const userId = c.get("dbUserId");
	const todoId = c.req.param("id");
	const db = createDb(c.env.DB);
	const service = new TodoService(db);

	try {
		await service.delete(userId, todoId);
		return c.json({ message: "Deleted" });
	} catch (e) {
		if (e instanceof TodoNotFoundError || e instanceof GoalNotFoundError) {
			return c.json({ message: "Not found" }, 404);
		}
		throw e;
	}
});

// PATCH /api/todos/:id/toggle - toggle completion
todosRoute.patch("/:id/toggle", async (c) => {
	const userId = c.get("dbUserId");
	const todoId = c.req.param("id");
	const db = createDb(c.env.DB);
	const service = new TodoService(db);

	try {
		const todo = await service.toggleComplete(userId, todoId);
		return c.json(todo);
	} catch (e) {
		if (e instanceof TodoNotFoundError || e instanceof GoalNotFoundError) {
			return c.json({ message: "Not found" }, 404);
		}
		throw e;
	}
});
