import { app } from "./app";
import { TodoRepository } from "./common/repositories/todoRepository";
import { createDb } from "./db";
import { DailyGoalReviewService } from "./features/coach/services/dailyGoalReviewService";
import type { Bindings } from "./types/env";

export default {
	fetch: app.fetch,
	// Cron Trigger（wrangler.toml の crons）から実行される
	async scheduled(_event, env, ctx) {
		const db = createDb(env.DB);
		await new TodoRepository(db).resetDailyCompletion();

		// GEMINI_API_KEY未設定(ローカル/一部環境)では日次レビューをスキップする
		if (env.GEMINI_API_KEY) {
			const reviewService = new DailyGoalReviewService(db);
			ctx.waitUntil(
				reviewService.runForAllGoals(env).catch((e) => console.error("daily review failed", e)),
			);
		}
	},
} satisfies ExportedHandler<Bindings>;
