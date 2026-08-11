import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { coachDailyReviews } from "../../db/schema";

export class CoachDailyReviewRepository {
	constructor(private db: Database) {}

	// 1goal×1dateの実行権を予約する。UNIQUE(goalId, reviewDate)制約により、既に予約/実行済み
	// なら挿入が失敗するのでcatchしてundefinedを返す(TOCTOUレース対策。並列cron実行や
	// 再実行があっても同日に二重でproposalが作られない)。
	async tryReserve(goalId: string, reviewDate: string): Promise<{ id: string } | undefined> {
		try {
			const row = await this.db
				.insert(coachDailyReviews)
				.values({ goalId, reviewDate })
				.returning({ id: coachDailyReviews.id })
				.get();
			return row;
		} catch {
			return undefined;
		}
	}

	// db.batch() 用のステートメント（実行しない）。LLM呼び出し成功後、生成された
	// assistantメッセージのidを予約行に紐づける(自動採番PKのため2段階のdb.batchに分かれる)
	linkMessageStmt(id: string, messageId: number) {
		return this.db.update(coachDailyReviews).set({ messageId }).where(eq(coachDailyReviews.id, id));
	}
}
