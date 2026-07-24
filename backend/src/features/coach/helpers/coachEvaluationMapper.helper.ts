import type { CoachEvaluationHistoryItem } from "../../../types/api";

export function mapCoachEvaluationToHistoryItem(evaluation: {
	id: string;
	persona: string;
	progressPercent: number;
	memo: string | null;
	obstacles: string | null;
	feedback: string;
	successRate: number;
	suggestions: string[];
	createdAt: string;
}): CoachEvaluationHistoryItem {
	return {
		id: evaluation.id,
		persona: evaluation.persona,
		progressPercent: evaluation.progressPercent,
		memo: evaluation.memo ?? undefined,
		obstacles: evaluation.obstacles ?? undefined,
		feedback: evaluation.feedback,
		successRate: evaluation.successRate,
		suggestions: evaluation.suggestions,
		createdAt: evaluation.createdAt,
	};
}
