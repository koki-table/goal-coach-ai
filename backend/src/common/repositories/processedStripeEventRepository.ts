import type { Database } from "../../db";
import { processedStripeEvents } from "../../db/schema";

export class ProcessedStripeEventRepository {
	constructor(private db: Database) {}

	// event.idをPKにinsertし、成功したら初回処理、unique制約違反(D1エラー)なら
	// 既に処理済みとしてfalseを返す(check-then-processのTOCTOUを避けるinsert-first方式)
	async markProcessed(eventId: string, eventType: string): Promise<boolean> {
		try {
			await this.db.insert(processedStripeEvents).values({ id: eventId, eventType }).run();
			return true;
		} catch {
			return false;
		}
	}
}
