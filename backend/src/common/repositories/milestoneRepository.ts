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

	async createMany(
		entries: {
			goalId: string;
			title: string;
			label?: string;
			sortOrder: number;
			isCompleted?: number;
			completedAt?: string | null;
		}[],
	) {
		if (entries.length === 0) return [];
		return this.db.insert(milestones).values(entries).returning().all();
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

	async deleteAllByGoalId(goalId: string) {
		return this.db.delete(milestones).where(eq(milestones.goalId, goalId)).returning().all();
	}
}
