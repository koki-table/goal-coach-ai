import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { coachDailyUsage } from "../../db/schema";

export class CoachDailyUsageRepository {
	constructor(private db: Database) {}

	// free tier用: 1SQL文でincrement+上限チェックをatomicに行う(TOCTOUレース対策)。
	// SQLiteのON CONFLICT DO UPDATE ... WHEREは、WHERE条件がfalseならUPDATEを
	// 適用せずno-opにする(初回INSERT自体は競合が無ければ常に成功する)。上限未満なら
	// incrementされた新しいcountを返し、上限に達している場合はno-opとなり
	// undefinedを返す(呼び出し側はundefined=blockedとして扱う)。
	async incrementIfUnderLimit(
		userId: string,
		date: string,
		limit: number,
	): Promise<number | undefined> {
		const now = new Date().toISOString();
		const row = await this.db
			.insert(coachDailyUsage)
			.values({ userId, date, decidedCount: 1, updatedAt: now })
			.onConflictDoUpdate({
				target: [coachDailyUsage.userId, coachDailyUsage.date],
				set: { decidedCount: sql`${coachDailyUsage.decidedCount} + 1`, updatedAt: now },
				setWhere: sql`${coachDailyUsage.decidedCount} < ${limit}`,
			})
			.returning({ decidedCount: coachDailyUsage.decidedCount })
			.get();
		return row?.decidedCount;
	}

	// pro tier用: 上限チェックなしで常にincrementする("無制限"訴求を守るためブロックしない。
	// ソフトリミット判定はincrement後のcountをCoachChatGate側で見て行う)
	async increment(userId: string, date: string): Promise<number> {
		const now = new Date().toISOString();
		const row = await this.db
			.insert(coachDailyUsage)
			.values({ userId, date, decidedCount: 1, updatedAt: now })
			.onConflictDoUpdate({
				target: [coachDailyUsage.userId, coachDailyUsage.date],
				set: { decidedCount: sql`${coachDailyUsage.decidedCount} + 1`, updatedAt: now },
			})
			.returning({ decidedCount: coachDailyUsage.decidedCount })
			.get();
		// onConflictDoUpdateにsetWhereが無い場合は常に行が返る
		if (row === undefined) throw new Error("unreachable: unconditional increment returned no row");
		return row.decidedCount;
	}

	// incrementIfUnderLimit/incrementで予約した1件を解放する(0未満にはしない)。
	// LLM呼び出しが失敗しメッセージが実際には永続化されなかった場合に呼ぶ
	// (呼ばないと、失敗するたびに無料ユーザーの残り回数が実際より早く減っていく)
	async decrement(userId: string, date: string): Promise<void> {
		await this.db
			.update(coachDailyUsage)
			.set({
				decidedCount: sql`MAX(${coachDailyUsage.decidedCount} - 1, 0)`,
				updatedAt: new Date().toISOString(),
			})
			.where(and(eq(coachDailyUsage.userId, userId), eq(coachDailyUsage.date, date)))
			.run();
	}

	// 表示用(GET /billing/status)。incrementせず現在値のみ読む
	async getCount(userId: string, date: string): Promise<number> {
		const row = await this.db
			.select({ decidedCount: coachDailyUsage.decidedCount })
			.from(coachDailyUsage)
			.where(and(eq(coachDailyUsage.userId, userId), eq(coachDailyUsage.date, date)))
			.get();
		return row?.decidedCount ?? 0;
	}
}
