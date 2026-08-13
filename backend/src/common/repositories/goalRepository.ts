import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { goals } from "../../db/schema";

export class GoalRepository {
	constructor(private db: Database) {}

	async findAllByUserId(userId: string) {
		return this.db.select().from(goals).where(eq(goals.userId, userId)).all();
	}

	async countActiveByUserId(userId: string): Promise<number> {
		const result = await this.db
			.select({ count: sql<number>`count(*)`.as("count") })
			.from(goals)
			.where(and(eq(goals.userId, userId), eq(goals.status, "active")))
			.get();
		return result?.count ?? 0;
	}

	async findByIdAndUserId(id: string, userId: string) {
		return this.db
			.select()
			.from(goals)
			.where(and(eq(goals.id, id), eq(goals.userId, userId)))
			.get();
	}

	// 日次レビュージョブ専用。全ユーザー横断でactive(進行中)なgoalを列挙する
	// (通常のCRUDはIDOR対策でuserIdスコープが必須だが、これはバッチ処理でありユーザー入力に
	// 応答するものではないため例外的に全件対象とする)。
	async findAllActiveForDailyReview() {
		return this.db
			.select({ id: goals.id, userId: goals.userId, title: goals.title, dueDate: goals.dueDate })
			.from(goals)
			.where(eq(goals.status, "active"))
			.all();
	}

	async create(data: {
		userId: string;
		title: string;
		description?: string;
		categoryId?: string;
		dueDate?: string;
	}) {
		const result = await this.db.insert(goals).values(data).returning().get();
		return result;
	}

	// db.batch() 用のステートメント（実行しない）。idはアトミック採用のため呼び出し側で採番する
	insertStmt(data: {
		id: string;
		userId: string;
		title: string;
		description?: string;
		categoryId?: string;
		dueDate?: string;
	}) {
		return this.db.insert(goals).values(data);
	}

	async update(
		id: string,
		userId: string,
		data: Partial<{
			title: string;
			description: string;
			categoryId: string;
			dueDate: string;
			status: string;
			completedAt: string;
		}>,
	) {
		return this.db
			.update(goals)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(and(eq(goals.id, id), eq(goals.userId, userId)))
			.returning()
			.get();
	}

	async delete(id: string, userId: string) {
		return this.db
			.delete(goals)
			.where(and(eq(goals.id, id), eq(goals.userId, userId)))
			.returning()
			.get();
	}

	// db.batch() 用のステートメント（実行しない）
	deleteStmt(id: string, userId: string) {
		return this.db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
	}
}
