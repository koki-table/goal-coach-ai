import { and, eq, isNull } from "drizzle-orm";
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

	// 探索スレッド(kind="exploration", goalId未確定)はユーザーに1本だけの前提。
	// 部分ユニークインデックス(idx_coach_conversations_user_exploration)がDB側の保証を担う
	async findOpenExplorationByUserId(userId: string) {
		return this.db
			.select()
			.from(coachConversations)
			.where(
				and(
					eq(coachConversations.userId, userId),
					eq(coachConversations.kind, "exploration"),
					isNull(coachConversations.goalId),
				),
			)
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

	// 探索スレッドの新規作成。goalIdは未確定のためnull、タイトル欄は検討中テーマのラベルとして使う
	async createExploration(data: { userId: string; titleSnapshot: string }) {
		return this.db
			.insert(coachConversations)
			.values({
				userId: data.userId,
				kind: "exploration",
				goalTitleSnapshot: data.titleSnapshot,
			})
			.returning()
			.get();
	}

	// db.batch() 用のステートメント（実行しない）。Objective採用時に探索スレッドをgoalスレッドへ
	// 遷移させる。goalIdが入ることでidx_coach_conversations_user_explorationの対象から外れ、
	// idx_coach_conversations_user_goal_idが「1目標1スレッド」を引き継ぐ
	linkGoalStmt(
		id: string,
		goalId: string,
		titleSnapshot: string,
		deadlineSnapshot: string | undefined,
	) {
		return this.db
			.update(coachConversations)
			.set({
				goalId,
				kind: "goal",
				goalTitleSnapshot: titleSnapshot,
				goalDeadlineSnapshot: deadlineSnapshot,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(coachConversations.id, id));
	}

	// db.batch() 用のステートメント（実行しない）
	touchStmt(id: string) {
		return this.db
			.update(coachConversations)
			.set({ updatedAt: new Date().toISOString() })
			.where(eq(coachConversations.id, id));
	}
}
