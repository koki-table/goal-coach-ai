import {
	CoachNotConfiguredError,
	CoachRateLimitError,
	GoalNotFoundError,
} from "../../../common/errors";
import { CoachEvaluationRepository } from "../../../common/repositories/coachEvaluationRepository";
import { GoalRepository } from "../../../common/repositories/goalRepository";
import { MilestoneRepository } from "../../../common/repositories/milestoneRepository";
import { TodoLogRepository } from "../../../common/repositories/todoLogRepository";
import { TodoRepository } from "../../../common/repositories/todoRepository";
import type { Database } from "../../../db";
import type { Bindings } from "../../../types/env";
import { buildUserPrompt } from "../helpers/coachPrompt.helper";
import { buildGoalSnapshot } from "../helpers/goalSnapshot.helper";
import { createCoachModel, evaluate } from "../lib/coachModel";
import { getSystemInstruction } from "../prompts/coachPrompts";
import type { CoachEvaluationResult, CoachPersona } from "../prompts/coachPrompts";

const COACH_DAILY_LIMIT = 20;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RECENT_EPISODES_LIMIT = 3;

export type CoachEvaluateInput = {
	goalId: string;
	progressPercent: number;
	memo?: string;
	obstacles?: string;
	persona: CoachPersona;
};

export class CoachService {
	private goalRepo: GoalRepository;
	private milestoneRepo: MilestoneRepository;
	private todoRepo: TodoRepository;
	private todoLogRepo: TodoLogRepository;
	private coachEvaluationRepo: CoachEvaluationRepository;

	constructor(private db: Database) {
		this.goalRepo = new GoalRepository(db);
		this.milestoneRepo = new MilestoneRepository(db);
		this.todoRepo = new TodoRepository(db);
		this.todoLogRepo = new TodoLogRepository(db);
		this.coachEvaluationRepo = new CoachEvaluationRepository(db);
	}

	async evaluateGoal(
		userId: string,
		input: CoachEvaluateInput,
		env: Bindings,
	): Promise<CoachEvaluationResult> {
		if (!env.GEMINI_API_KEY) {
			throw new CoachNotConfiguredError();
		}

		const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
		const recentCount = await this.coachEvaluationRepo.countByUserIdSince(userId, since);
		if (recentCount >= COACH_DAILY_LIMIT) {
			throw new CoachRateLimitError(userId);
		}

		const goal = await this.goalRepo.findByIdAndUserId(input.goalId, userId);
		if (!goal) {
			throw new GoalNotFoundError(input.goalId);
		}

		const [milestones, todos] = await Promise.all([
			this.milestoneRepo.findAllByGoalId(goal.id),
			this.todoRepo.findAllByGoalId(goal.id),
		]);
		const todoLogs = await this.todoLogRepo.findAllByTodoIds(todos.map((t) => t.id));

		const snapshot = buildGoalSnapshot(todos, milestones, todoLogs, new Date());

		const recentEvaluations = await this.coachEvaluationRepo.findRecentByGoalId(
			goal.id,
			RECENT_EPISODES_LIMIT,
		);

		const prompt = buildUserPrompt({
			goal: { title: goal.title, deadline: goal.dueDate },
			milestones: milestones.map((m) => ({ title: m.title, isCompleted: m.isCompleted === 1 })),
			snapshot,
			selfReportedProgressPercent: input.progressPercent,
			memo: input.memo,
			obstacles: input.obstacles,
			recentEpisodes: recentEvaluations.map((e) => ({
				createdAt: e.createdAt,
				progressPercent: e.progressPercent,
				memo: e.memo,
				obstacles: e.obstacles,
				feedback: e.feedback,
			})),
		});

		const model = createCoachModel(env);
		const result = await evaluate({
			model,
			system: getSystemInstruction(input.persona),
			prompt,
		});

		await this.coachEvaluationRepo.create(
			{
				goalId: goal.id,
				persona: input.persona,
				progressPercent: input.progressPercent,
				memo: input.memo,
				obstacles: input.obstacles,
				feedback: result.feedback,
				successRate: result.successRate,
			},
			result.actionableSuggestions,
		);

		return result;
	}
}
