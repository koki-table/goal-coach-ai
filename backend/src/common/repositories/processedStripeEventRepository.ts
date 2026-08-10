import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { processedStripeEvents } from "../../db/schema";

// D1/SQLiteのUNIQUE制約違反はこの文字列を含むエラーメッセージを投げる。
// この判定を通らない例外(一時的な書き込み失敗・クォータ超過等)は「重複」と
// 誤判定せず呼び出し元に伝播させる(重複でない失敗を握り潰すとイベントが
// 永久に処理不能になる)
function isUniqueConstraintViolation(error: unknown): boolean {
	return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

export class ProcessedStripeEventRepository {
	constructor(private db: Database) {}

	// event.idをPKにinsertし、成功したら初回処理、unique制約違反(D1エラー)なら
	// 既に処理済みとしてfalseを返す(check-then-processのTOCTOUを避けるinsert-first方式)。
	// UNIQUE違反以外の例外はここで握り潰さずre-throwする(呼び出し元で500を返しStripeに
	// 再送させる。ここで揉み消すと副作用が永久に発生しなくなる)
	async markProcessed(eventId: string, eventType: string): Promise<boolean> {
		try {
			await this.db.insert(processedStripeEvents).values({ id: eventId, eventType }).run();
			return true;
		} catch (error) {
			if (isUniqueConstraintViolation(error)) {
				return false;
			}
			console.error("Failed to record processed Stripe event:", error);
			throw error;
		}
	}

	async isProcessed(eventId: string): Promise<boolean> {
		const row = await this.db
			.select({ id: processedStripeEvents.id })
			.from(processedStripeEvents)
			.where(eq(processedStripeEvents.id, eventId))
			.get();
		return row !== undefined;
	}
}
