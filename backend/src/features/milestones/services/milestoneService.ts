import { eq } from "drizzle-orm";
import { GoalNotFoundError, MilestoneNotFoundError } from "../../../common/errors";
import { GoalRepository } from "../../../common/repositories/goalRepository";
import { MilestoneRepository } from "../../../common/repositories/milestoneRepository";
import type { Database } from "../../../db";
import { milestones, todos } from "../../../db/schema";
import type { MilestoneCreateRequest, MilestoneResponse } from "../../../types/api";
import { mapMilestoneToResponse } from "../helpers/milestoneMapper.helper";

export class MilestoneService {
	private db: Database;
	private milestoneRepo: MilestoneRepository;
	private goalRepo: GoalRepository;

	constructor(db: Database) {
		this.db = db;
		this.milestoneRepo = new MilestoneRepository(db);
		this.goalRepo = new GoalRepository(db);
	}

	async getByGoalId(userId: string, goalId: string): Promise<MilestoneResponse[]> {
		await this.verifyGoalOwnership(userId, goalId);

		const milestones = await this.milestoneRepo.findAllByGoalId(goalId);
		return milestones.map(mapMilestoneToResponse);
	}

	async getAllGroupedByGoal(userId: string): Promise<Record<string, MilestoneResponse[]>> {
		const goals = await this.goalRepo.findAllByUserId(userId);
		const goalIds = goals.map((g) => g.id);

		if (goalIds.length === 0) return {};

		const allMilestones = await this.milestoneRepo.findAllByGoalIds(goalIds);

		const result: Record<string, MilestoneResponse[]> = {};
		for (const goalId of goalIds) {
			const goalMilestones = allMilestones.filter((m) => m.goalId === goalId);
			result[goalId] = goalMilestones.map(mapMilestoneToResponse);
		}

		return result;
	}

	async createBatch(
		userId: string,
		goalId: string,
		entries: MilestoneCreateRequest[],
	): Promise<MilestoneResponse[]> {
		await this.verifyGoalOwnership(userId, goalId);

		const now = new Date().toISOString();
		// todosの複合FK(milestoneId, goalId)のSET NULLはNOT NULLのgoalIdまでNULL化しようとして
		// 失敗するため、milestone削除前にtodoの紐付けを明示的に解除する（原子性はD1のbatch）
		const unlinkTodos = this.db
			.update(todos)
			.set({ milestoneId: null, updatedAt: now })
			.where(eq(todos.goalId, goalId));
		const deleteMilestones = this.db.delete(milestones).where(eq(milestones.goalId, goalId));

		if (entries.length === 0) {
			await this.db.batch([unlinkTodos, deleteMilestones]);
			return [];
		}

		const insertMilestones = this.db
			.insert(milestones)
			.values(
				entries.map((entry) => ({
					goalId,
					title: entry.title,
					label: entry.label,
					sortOrder: entry.order,
					isCompleted: entry.isCompleted ? 1 : 0,
					completedAt: entry.isCompleted ? now : null,
				})),
			)
			.returning();

		const [, , created] = await this.db.batch([unlinkTodos, deleteMilestones, insertMilestones]);
		return created.map(mapMilestoneToResponse);
	}

	async update(
		userId: string,
		milestoneId: string,
		data: { title?: string; label?: string; isCompleted?: boolean },
	): Promise<MilestoneResponse> {
		const milestone = await this.milestoneRepo.findById(milestoneId);
		if (!milestone) {
			throw new MilestoneNotFoundError(milestoneId);
		}

		await this.verifyGoalOwnership(userId, milestone.goalId);

		const updateData: Record<string, unknown> = {};
		if (data.title !== undefined) updateData.title = data.title;
		if (data.label !== undefined) updateData.label = data.label;
		if (data.isCompleted !== undefined) {
			updateData.isCompleted = data.isCompleted ? 1 : 0;
			updateData.completedAt = data.isCompleted ? new Date().toISOString() : null;
		}

		const updated = await this.milestoneRepo.update(milestoneId, updateData);
		if (!updated) {
			throw new MilestoneNotFoundError(milestoneId);
		}

		return mapMilestoneToResponse(updated);
	}

	private async verifyGoalOwnership(userId: string, goalId: string): Promise<void> {
		const goal = await this.goalRepo.findByIdAndUserId(goalId, userId);
		if (!goal) {
			throw new GoalNotFoundError(goalId);
		}
	}
}
