import { and, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { defaultCategories, goalCategories } from "../../db/schema";

export class GoalCategoryRepository {
	constructor(private db: Database) {}

	async findAllByUserId(userId: string) {
		return this.db.select().from(goalCategories).where(eq(goalCategories.userId, userId)).all();
	}

	async findByUserIdAndName(userId: string, name: string) {
		return this.db
			.select()
			.from(goalCategories)
			.where(and(eq(goalCategories.userId, userId), eq(goalCategories.name, name)))
			.get();
	}

	async createDefaultCategories(userId: string) {
		const values = defaultCategories.map((cat, index) => ({
			userId,
			name: cat.name,
			color: cat.color,
			sortOrder: index,
		}));
		return this.db.insert(goalCategories).values(values).returning().all();
	}
}
