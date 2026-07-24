export type CoachEvaluationResult = {
	feedback: string;
	successRate: number;
	actionableSuggestions: string[];
};

export type CoachEvaluationHistoryItem = {
	id: string;
	persona: string;
	progressPercent: number;
	memo?: string;
	obstacles?: string;
	feedback: string;
	successRate: number;
	suggestions: string[];
	createdAt: string;
};
