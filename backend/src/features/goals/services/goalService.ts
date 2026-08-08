import { GoalLimitExceededError, GoalNotFoundError } from "../../../common/errors";
import { resolveCategoryId } from "../../../common/helpers/categoryResolution.helper";
import {
	MAX_ACTIVE_GOALS,
	isActiveGoalLimitReached,
} from "../../../common/helpers/goalLimit.helper";
import { GoalCategoryRepository } from "../../../common/repositories/goalCategoryRepository";
import { GoalRepository } from "../../../common/repositories/goalRepository";
import { TodoRepository } from "../../../common/repositories/todoRepository";
import type { Database } from "../../../db";
import type { GoalCreateRequest, GoalResponse, GoalUpdateRequest } from "../../../types/api";
import { getCategoryNameFromKey, mapGoalToResponse } from "../helpers/categoryMapping.helper";

export class GoalService {
	private db: Database;
	private goalRepo: GoalRepository;
	private categoryRepo: GoalCategoryRepository;
	private todoRepo: TodoRepository;

	constructor(db: Database) {
		this.db = db;
		this.goalRepo = new GoalRepository(db);
		this.categoryRepo = new GoalCategoryRepository(db);
		this.todoRepo = new TodoRepository(db);
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
		const existing = await this.goalRepo.findAllByUserId(userId);
		if (isActiveGoalLimitReached(existing, MAX_ACTIVE_GOALS)) {
			throw new GoalLimitExceededError(MAX_ACTIVE_GOALS);
		}

		const categoryId = await resolveCategoryId(this.categoryRepo, userId, input.category);

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
			updateData.categoryId = await resolveCategoryId(this.categoryRepo, userId, input.category);
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
		const existing = await this.goalRepo.findByIdAndUserId(goalId, userId);
		if (!existing) {
			throw new GoalNotFoundError(goalId);
		}

		// milestonesへのcascade削除が複合FKのSET NULLを発火させ、NOT NULLの
		// todos.goalIdまでNULLにしようとして失敗するため、先にtodoの紐づけを解除する。
		// D1はdb.transaction()非対応のためdb.batch()でアトミックに実行する。
		await this.db.batch([
			this.todoRepo.unlinkByGoalIdStmt(goalId),
			this.goalRepo.deleteStmt(goalId, userId),
		]);
	}
}
