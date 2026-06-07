import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/errorHandler";
import { routes } from "./routes";
import type { Variables } from "./types/context";
import type { Bindings } from "./types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.onError(errorHandler);

app.use("*", (c, next) => {
	const middleware = corsMiddleware(c.env.ALLOWED_ORIGINS);
	return middleware(c, next);
});

app.route("/api", routes);

export { app };
