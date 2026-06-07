import { GoalNotFoundError } from "../../../common/errors";
import { GoalCategoryRepository } from "../../../common/repositories/goalCategoryRepository";
import { GoalRepository } from "../../../common/repositories/goalRepository";
import type { Database } from "../../../db";
import type {
	GoalCategoryType,
	GoalCreateRequest,
	GoalResponse,
	GoalUpdateRequest,
} from "../../../types/api";
import { getCategoryNameFromKey, mapGoalToResponse } from "../helpers/categoryMapping.helper";

export class GoalService {
	private goalRepo: GoalRepository;
	private categoryRepo: GoalCategoryRepository;

	constructor(db: Database) {
		this.goalRepo = new GoalRepository(db);
		this.categoryRepo = new GoalCategoryRepository(db);
	}

	async getAll(userId: string): Promise<GoalResponse[]> {
		const [goals, categories] = await Promise.all([
			this.goalRepo.findAllByUserId(userId),
			this.categoryRepo.findAllByUserId(userId),
		]);

		const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

		return goals.map((goal) => {
			const categoryName = goal.categoryId ? (categoryMap.get(goal.categoryId) ?? null) : null;
			return mapGoalToResponse(goal, categoryName);
		});
	}

	async create(userId: string, input: GoalCreateRequest): Promise<GoalResponse> {
		const categoryId = await this.resolveCategoryId(userId, input.category);

		const goal = await this.goalRepo.create({
			userId,
			title: input.title,
			description: input.description,
			categoryId,
			dueDate: input.deadline,
		});

		const categoryName = getCategoryNameFromKey(input.category);
		return mapGoalToResponse(goal, categoryName);
	}

	async update(userId: string, goalId: string, input: GoalUpdateRequest): Promise<GoalResponse> {
		const existing = await this.goalRepo.findByIdAndUserId(goalId, userId);
		if (!existing) {
			throw new GoalNotFoundError(goalId);
		}

		const updateData: Record<string, unknown> = {};
		if (input.title !== undefined) updateData.title = input.title;
		if (input.description !== undefined) updateData.description = input.description;
		if (input.deadline !== undefined) updateData.dueDate = input.deadline;
		if (input.category !== undefined) {
			updateData.categoryId = await this.resolveCategoryId(userId, input.category);
		}

		const updated = await this.goalRepo.update(goalId, userId, updateData);
		if (!updated) {
			throw new GoalNotFoundError(goalId);
		}

		const categories = await this.categoryRepo.findAllByUserId(userId);
		const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
		const categoryName = updated.categoryId ? (categoryMap.get(updated.categoryId) ?? null) : null;

		return mapGoalToResponse(updated, categoryName);
	}

	async delete(userId: string, goalId: string): Promise<void> {
		const deleted = await this.goalRepo.delete(goalId, userId);
		if (!deleted) {
			throw new GoalNotFoundError(goalId);
		}
	}

	private async resolveCategoryId(userId: string, categoryKey: GoalCategoryType): Promise<string> {
		const categoryName = getCategoryNameFromKey(categoryKey);

		let category = await this.categoryRepo.findByUserIdAndName(userId, categoryName);
		if (!category) {
			const created = await this.categoryRepo.createDefaultCategories(userId);
			category = created.find((c) => c.name === categoryName) ?? created[0];
		}

		return category.id;
	}
}
