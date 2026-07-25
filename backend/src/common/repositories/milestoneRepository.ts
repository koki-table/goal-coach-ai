import { eq, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import { milestones } from "../../db/schema";

export class MilestoneRepository {
	constructor(private db: Database) {}

	async findAllByGoalId(goalId: string) {
		return this.db.select().from(milestones).where(eq(milestones.goalId, goalId)).all();
	}

	async findAllByGoalIds(goalIds: string[]) {
		if (goalIds.length === 0) return [];
		return this.db.select().from(milestones).where(inArray(milestones.goalId, goalIds)).all();
	}

	async findById(id: string) {
		return this.db.select().from(milestones).where(eq(milestones.id, id)).get();
	}

	async create(data: { goalId: string; title: string; sortOrder: number }) {
		return this.db.insert(milestones).values(data).returning().get();
	}

	async update(
		id: string,
		data: Partial<{
			title: string;
			label: string;
			isCompleted: number;
			completedAt: string | null;
			sortOrder: number;
		}>,
	) {
		return this.db
			.update(milestones)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(eq(milestones.id, id))
			.returning()
			.get();
	}

	// db.batch() 用のステートメント（実行しない）
	deleteByIdsStmt(ids: string[]) {
		return this.db.delete(milestones).where(inArray(milestones.id, ids));
	}

	// db.batch() 用のステートメント（実行しない）
	updateStmt(
		id: string,
		data: Partial<{
			title: string;
			label: string;
			sortOrder: number;
			isCompleted: number;
			completedAt: string | null;
		}>,
	) {
		return this.db
			.update(milestones)
			.set({ ...data, updatedAt: new Date().toISOString() })
			.where(eq(milestones.id, id));
	}

	// db.batch() 用のステートメント（実行しない）
	insertManyStmt(
		entries: {
			goalId: string;
			title: string;
			label?: string;
			sortOrder: number;
			isCompleted?: number;
			completedAt?: string;
		}[],
	) {
		return this.db.insert(milestones).values(entries);
	}
}
