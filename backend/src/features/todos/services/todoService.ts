import { GoalNotFoundError, TodoNotFoundError } from "../../../common/errors";
import { GoalRepository } from "../../../common/repositories/goalRepository";
import { MilestoneRepository } from "../../../common/repositories/milestoneRepository";
import { TodoLogRepository } from "../../../common/repositories/todoLogRepository";
import { TodoRepository } from "../../../common/repositories/todoRepository";
import type { Database } from "../../../db";
import type {
	GoalWithTodosResponse,
	TodoCreateRequest,
	TodoResponse,
	TodoUpdateRequest,
} from "../../../types/api";
import { mapMilestoneToResponse } from "../../milestones/helpers/milestoneMapper.helper";
import { mapTodoToResponse } from "../helpers/todoMapper.helper";

export class TodoService {
	private todoRepo: TodoRepository;
	private todoLogRepo: TodoLogRepository;
	private goalRepo: GoalRepository;
	private milestoneRepo: MilestoneRepository;

	constructor(db: Database) {
		this.todoRepo = new TodoRepository(db);
		this.todoLogRepo = new TodoLogRepository(db);
		this.goalRepo = new GoalRepository(db);
		this.milestoneRepo = new MilestoneRepository(db);
	}

	async getAllByUser(userId: string): Promise<GoalWithTodosResponse[]> {
		const goals = await this.goalRepo.findAllByUserId(userId);
		if (goals.length === 0) return [];

		const goalIds = goals.map((g) => g.id);
		const [todos, allMilestones] = await Promise.all([
			this.todoRepo.findAllByGoalIds(goalIds),
			this.milestoneRepo.findAllByGoalIds(goalIds),
		]);

		const todoIds = todos.map((t) => t.id);
		const completionCounts = await this.todoLogRepo.countCompletedByTodoIds(todoIds);

		const grouped: GoalWithTodosResponse[] = goals.map((goal) => {
			const goalTodos = todos.filter((t) => t.goalId === goal.id);
			const goalMilestones = allMilestones.filter((m) => m.goalId === goal.id);
			const mapped = goalTodos.map((t) => mapTodoToResponse(t, completionCounts.get(t.id) ?? 0));

			return {
				goalId: goal.id,
				goalTitle: goal.title,
				milestones: goalMilestones.map(mapMilestoneToResponse),
				aiGeneratedTodos: mapped.filter((t) => t.isAiGenerated),
				myTodos: mapped.filter((t) => !t.isAiGenerated),
			};
		});

		return grouped;
	}

	async getByGoalId(userId: string, goalId: string): Promise<TodoResponse[]> {
		await this.verifyGoalOwnership(userId, goalId);

		const todos = await this.todoRepo.findAllByGoalId(goalId);
		const todoIds = todos.map((t) => t.id);
		const completionCounts = await this.todoLogRepo.countCompletedByTodoIds(todoIds);

		return todos.map((t) => mapTodoToResponse(t, completionCounts.get(t.id) ?? 0));
	}

	async create(userId: string, goalId: string, input: TodoCreateRequest): Promise<TodoResponse> {
		await this.verifyGoalOwnership(userId, goalId);

		const todo = await this.todoRepo.create({
			goalId,
			title: input.title,
			description: input.description,
			dueDate: input.dueDate,
			estimatedMinutes: input.estimatedMinutes,
			milestoneId: input.milestoneId,
			priority: input.priority,
			isAiGenerated: input.isAiGenerated ? 1 : 0,
		});

		return mapTodoToResponse(todo, 0);
	}

	async update(userId: string, todoId: string, input: TodoUpdateRequest): Promise<TodoResponse> {
		const todo = await this.todoRepo.findById(todoId);
		if (!todo) {
			throw new TodoNotFoundError(todoId);
		}

		await this.verifyGoalOwnership(userId, todo.goalId);

		const updateData: Record<string, unknown> = {};
		if (input.title !== undefined) updateData.title = input.title;
		if (input.description !== undefined) updateData.description = input.description;
		if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
		if (input.estimatedMinutes !== undefined) updateData.estimatedMinutes = input.estimatedMinutes;
		if (input.milestoneId !== undefined) updateData.milestoneId = input.milestoneId;
		if (input.priority !== undefined) updateData.priority = input.priority;

		const updated = await this.todoRepo.update(todoId, updateData);
		if (!updated) {
			throw new TodoNotFoundError(todoId);
		}

		const completionCounts = await this.todoLogRepo.countCompletedByTodoIds([todoId]);
		return mapTodoToResponse(updated, completionCounts.get(todoId) ?? 0);
	}

	async delete(userId: string, todoId: string): Promise<void> {
		const todo = await this.todoRepo.findById(todoId);
		if (!todo) {
			throw new TodoNotFoundError(todoId);
		}

		await this.verifyGoalOwnership(userId, todo.goalId);

		const deleted = await this.todoRepo.delete(todoId);
		if (!deleted) {
			throw new TodoNotFoundError(todoId);
		}
	}

	async toggleComplete(userId: string, todoId: string): Promise<TodoResponse> {
		const todo = await this.todoRepo.findById(todoId);
		if (!todo) {
			throw new TodoNotFoundError(todoId);
		}

		await this.verifyGoalOwnership(userId, todo.goalId);

		const newIsCompleted = todo.isCompleted === 1 ? 0 : 1;
		const updated = await this.todoRepo.update(todoId, {
			isCompleted: newIsCompleted,
			completedAt: newIsCompleted === 1 ? new Date().toISOString() : null,
		});

		if (!updated) {
			throw new TodoNotFoundError(todoId);
		}

		if (newIsCompleted === 1) {
			await this.todoLogRepo.create({ todoId, type: "completed" });
		}

		const completionCounts = await this.todoLogRepo.countCompletedByTodoIds([todoId]);
		return mapTodoToResponse(updated, completionCounts.get(todoId) ?? 0);
	}

	async reorder(
		userId: string,
		goalId: string,
		entries: { id: string; sortOrder: number }[],
	): Promise<void> {
		await this.verifyGoalOwnership(userId, goalId);
		await this.todoRepo.updateSortOrders(entries);
	}

	private async verifyGoalOwnership(userId: string, goalId: string): Promise<void> {
		const goal = await this.goalRepo.findByIdAndUserId(goalId, userId);
		if (!goal) {
			throw new GoalNotFoundError(goalId);
		}
	}
}
