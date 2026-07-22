import { app } from "./app";
import { TodoRepository } from "./common/repositories/todoRepository";
import { createDb } from "./db";
import type { Bindings } from "./types/env";

export default {
	fetch: app.fetch,
	// Cron Trigger（wrangler.toml の crons）から実行される
	async scheduled(_event, env, _ctx) {
		const db = createDb(env.DB);
		await new TodoRepository(db).resetDailyCompletion();
	},
} satisfies ExportedHandler<Bindings>;
