import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { coachEvaluationSuggestions, coachEvaluations, goals } from "../../db/schema";

export class CoachEvaluationRepository {
	constructor(private db: Database) {}

	async create(
		evaluation: {
			goalId: string;
			persona: string;
			progressPercent: number;
			memo?: string;
			obstacles?: string;
			feedback: string;
			successRate: number;
		},
		suggestions: string[],
	) {
		const id = crypto.randomUUID();
		const createdAt = new Date().toISOString();

		// D1はdb.transaction()非対応のためdb.batch()でアトミックに実行する。
		await this.db.batch([
			this.db.insert(coachEvaluations).values({ id, ...evaluation, createdAt }),
			this.db.insert(coachEvaluationSuggestions).values(
				suggestions.map((content, index) => ({
					evaluationId: id,
					content,
					sortOrder: index,
				})),
			),
		]);

		return { id, ...evaluation, createdAt };
	}

	async findRecentByGoalId(goalId: string, limit: number) {
		const evaluations = await this.db
			.select()
			.from(coachEvaluations)
			.where(eq(coachEvaluations.goalId, goalId))
			.orderBy(desc(coachEvaluations.createdAt))
			.limit(limit)
			.all();

		if (evaluations.length === 0) return [];

		const evaluationIds = evaluations.map((e) => e.id);
		const suggestions = await this.db
			.select()
			.from(coachEvaluationSuggestions)
			.where(inArray(coachEvaluationSuggestions.evaluationId, evaluationIds))
			.orderBy(coachEvaluationSuggestions.sortOrder)
			.all();

		const suggestionsByEvaluationId = new Map<string, string[]>();
		for (const suggestion of suggestions) {
			const list = suggestionsByEvaluationId.get(suggestion.evaluationId) ?? [];
			list.push(suggestion.content);
			suggestionsByEvaluationId.set(suggestion.evaluationId, list);
		}

		return evaluations.map((evaluation) => ({
			...evaluation,
			suggestions: suggestionsByEvaluationId.get(evaluation.id) ?? [],
		}));
	}

	// userIdはgoalEvaluationsに保持しないため、goalsとjoinして所有者の直近件数を数える
	async countByUserIdSince(userId: string, isoSince: string): Promise<number> {
		const result = await this.db
			.select({ count: sql<number>`count(*)`.as("count") })
			.from(coachEvaluations)
			.innerJoin(goals, eq(coachEvaluations.goalId, goals.id))
			.where(and(eq(goals.userId, userId), gte(coachEvaluations.createdAt, isoSince)))
			.get();

		return result?.count ?? 0;
	}
}
