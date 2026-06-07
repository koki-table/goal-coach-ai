import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export const errorHandler: ErrorHandler = (err, c) => {
	console.error("Unhandled error:", err);

	if (err instanceof HTTPException) {
		return c.json({ message: err.message }, err.status);
	}

	return c.json({ message: "Internal server error" }, 500);
};
