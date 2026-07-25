import { and, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { coachConversations } from "../../db/schema";

export class CoachConversationRepository {
	constructor(private db: Database) {}

	// goalIdごとに1スレッドの前提。goal削除後(goalId=null)の会話はfindByGoalIdの対象外になる
	async findByGoalId(userId: string, goalId: string) {
		return this.db
			.select()
			.from(coachConversations)
			.where(and(eq(coachConversations.userId, userId), eq(coachConversations.goalId, goalId)))
			.get();
	}

	async findByIdAndUserId(id: string, userId: string) {
		return this.db
			.select()
			.from(coachConversations)
			.where(and(eq(coachConversations.id, id), eq(coachConversations.userId, userId)))
			.get();
	}

	async create(data: {
		userId: string;
		goalId: string;
		goalTitleSnapshot: string;
		goalDeadlineSnapshot?: string;
	}) {
		return this.db.insert(coachConversations).values(data).returning().get();
	}

	// db.batch() 用のステートメント（実行しない）
	touchStmt(id: string) {
		return this.db
			.update(coachConversations)
			.set({ updatedAt: new Date().toISOString() })
			.where(eq(coachConversations.id, id));
	}
}
