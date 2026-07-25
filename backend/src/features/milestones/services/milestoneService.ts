import type { BatchItem } from "drizzle-orm/batch";
import { GoalNotFoundError, MilestoneNotFoundError } from "../../../common/errors";
import { GoalRepository } from "../../../common/repositories/goalRepository";
import { MilestoneRepository } from "../../../common/repositories/milestoneRepository";
import { TodoRepository } from "../../../common/repositories/todoRepository";
import type { Database } from "../../../db";
import type { MilestoneCreateRequest, MilestoneResponse } from "../../../types/api";
import { mapMilestoneToResponse } from "../helpers/milestoneMapper.helper";
import { calculateMilestoneSync } from "../helpers/milestoneSync.helper";

export class MilestoneService {
	// AIコーチ提案の採用フロー(createOne)で使う既定label。手動作成(createBatch)はlabel必須のため、
	// AI提案由来と分かるよう固定文言を付与する
	private static readonly AI_PROPOSED_LABEL = "AI提案";

	private db: Database;
	private milestoneRepo: MilestoneRepository;
	private goalRepo: GoalRepository;
	private todoRepo: TodoRepository;

	constructor(db: Database) {
		this.db = db;
		this.milestoneRepo = new MilestoneRepository(db);
		this.goalRepo = new GoalRepository(db);
		this.todoRepo = new TodoRepository(db);
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

	// 差分同期: 既存(idあり)は更新、idなしは新規作成、リクエストに無い既存は削除。
	// 削除対象に紐づくtodoは先にmilestoneIdを解除する（複合FKのSET NULLがNOT NULLの
	// goalIdまでNULLにしようとして削除が失敗するため）。
	async createBatch(
		userId: string,
		goalId: string,
		entries: MilestoneCreateRequest[],
	): Promise<MilestoneResponse[]> {
		await this.verifyGoalOwnership(userId, goalId);

		const existing = await this.milestoneRepo.findAllByGoalId(goalId);
		const { toDelete, toUpdate, toInsert } = calculateMilestoneSync(existing, entries);

		const now = new Date().toISOString();
		const statements: BatchItem<"sqlite">[] = [];

		if (toDelete.length > 0) {
			statements.push(this.todoRepo.unlinkByMilestoneIdsStmt(toDelete));
			statements.push(this.milestoneRepo.deleteByIdsStmt(toDelete));
		}

		for (const update of toUpdate) {
			statements.push(
				this.milestoneRepo.updateStmt(update.id, {
					title: update.title,
					label: update.label,
					sortOrder: update.sortOrder,
					...(update.isCompleted !== undefined && {
						isCompleted: update.isCompleted ? 1 : 0,
						completedAt: update.isCompleted ? now : null,
					}),
				}),
			);
		}

		if (toInsert.length > 0) {
			statements.push(
				this.milestoneRepo.insertManyStmt(
					toInsert.map((entry) => ({
						goalId,
						title: entry.title,
						label: entry.label,
						sortOrder: entry.sortOrder,
						...(entry.isCompleted && { isCompleted: 1, completedAt: now }),
					})),
				),
			);
		}

		// D1はdb.transaction()非対応のためdb.batch()を使う（全体がアトミックに実行される）
		if (statements.length > 0) {
			await this.db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
		}

		const refreshed = await this.milestoneRepo.findAllByGoalId(goalId);
		return refreshed.sort((a, b) => a.sortOrder - b.sortOrder).map(mapMilestoneToResponse);
	}

	// チャット提案の採用フロー専用の単体作成。既存createBatchは全件差分同期用でこのユースケースには不向き
	async createOne(userId: string, goalId: string, title: string): Promise<MilestoneResponse> {
		await this.verifyGoalOwnership(userId, goalId);

		const sortOrder = await this.milestoneRepo.nextSortOrder(goalId);

		const created = await this.milestoneRepo.create({
			goalId,
			title,
			label: MilestoneService.AI_PROPOSED_LABEL,
			sortOrder,
		});
		return mapMilestoneToResponse(created);
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

		// isCompletedの変更時は、紐づくTODOの完了状態もマイルストーンに合わせて一括で揃える
		// （完了トグルはtodo_logsへの記録を行わない一括反映であり、個別完了とは区別する）
		if (data.isCompleted !== undefined) {
			await this.db.batch([
				this.milestoneRepo.updateStmt(milestoneId, updateData),
				this.todoRepo.updateCompletionByMilestoneIdStmt(milestoneId, data.isCompleted),
			]);

			const updated = await this.milestoneRepo.findById(milestoneId);
			if (!updated) {
				throw new MilestoneNotFoundError(milestoneId);
			}
			return mapMilestoneToResponse(updated);
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
