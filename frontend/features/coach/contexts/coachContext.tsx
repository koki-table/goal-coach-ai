"use client";

import { calculateGoalProgress } from "@/features/goals/helpers/goalProgress.helper";
import { useGoals } from "@/features/goals/hooks/useGoals";
import type { Goal } from "@/features/goals/types";
import { useAllMilestones } from "@/features/todos/hooks/useMilestones";
import { useTodos } from "@/features/todos/hooks/useTodos";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CoachErrorInfo } from "../helpers/coachErrorMessage.helper";
import { useCoachEvaluation } from "../hooks/useCoachEvaluation";
import { useCoachEvaluationHistory } from "../hooks/useCoachEvaluationHistory";
import { coachEvaluateInputSchema } from "../schemas/coachSchema";
import type { CoachEvaluationHistoryItem, CoachEvaluationResult } from "../types";

type SubmitEvaluationInput = {
	memo?: string;
	obstacles?: string;
};

type CoachContextValue = {
	goals: Goal[];
	goalsLoading: boolean;
	selectedGoalId: string | undefined;
	selectedGoal: Goal | undefined;
	selectGoal: (goalId: string) => void;
	autoProgressPercent: number;
	evaluationResult: CoachEvaluationResult | undefined;
	isEvaluating: boolean;
	evaluationError: CoachErrorInfo | undefined;
	submitEvaluation: (data: SubmitEvaluationInput) => Promise<void>;
	resetEvaluation: () => void;
	addSuggestionAsTodo: (title: string) => Promise<void>;
	evaluationHistory: CoachEvaluationHistoryItem[];
	historyLoading: boolean;
};

const CoachContext = createContext<CoachContextValue | undefined>(undefined);

export function CoachProvider({ children }: { children: React.ReactNode }) {
	const { data: goals, isLoading: goalsLoading } = useGoals();
	const { goalsWithTodos, addTodo } = useTodos();
	const { milestonesMap } = useAllMilestones();
	const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(undefined);
	const { result, isEvaluating, error, evaluate, reset } = useCoachEvaluation();
	const {
		history: evaluationHistory,
		isLoading: historyLoading,
		mutate: mutateHistory,
	} = useCoachEvaluationHistory(selectedGoalId);

	const selectedGoal = goals?.find((g) => g.id === selectedGoalId);

	const autoProgressPercent = useMemo(() => {
		if (!selectedGoalId) return 0;
		const goalWithTodos = goalsWithTodos.find((g) => g.goalId === selectedGoalId);
		const totalTodos =
			(goalWithTodos?.aiGeneratedTodos.length ?? 0) + (goalWithTodos?.myTodos.length ?? 0);
		const completedTodos = [
			...(goalWithTodos?.aiGeneratedTodos ?? []),
			...(goalWithTodos?.myTodos ?? []),
		].filter((t) => t.completed).length;
		const milestones = milestonesMap[selectedGoalId] ?? [];
		const totalMilestones = milestones.length;
		const completedMilestones = milestones.filter((m) => m.isCompleted).length;
		return calculateGoalProgress({
			totalTodos,
			completedTodos,
			totalMilestones,
			completedMilestones,
		});
	}, [selectedGoalId, goalsWithTodos, milestonesMap]);

	const selectGoal = useCallback(
		(goalId: string) => {
			setSelectedGoalId(goalId);
			reset();
		},
		[reset],
	);

	const submitEvaluation = useCallback(
		async (data: SubmitEvaluationInput) => {
			if (!selectedGoalId) return;
			const parsed = coachEvaluateInputSchema.safeParse({
				...data,
				goalId: selectedGoalId,
				progressPercent: autoProgressPercent,
			});
			if (!parsed.success) return;
			await evaluate(parsed.data);
			await mutateHistory();
		},
		[selectedGoalId, autoProgressPercent, evaluate, mutateHistory],
	);

	const addSuggestionAsTodo = useCallback(
		async (title: string) => {
			if (!selectedGoalId) return;
			await addTodo(selectedGoalId, { title }, true);
		},
		[selectedGoalId, addTodo],
	);

	const value: CoachContextValue = {
		goals: goals ?? [],
		goalsLoading,
		selectedGoalId,
		selectedGoal,
		selectGoal,
		autoProgressPercent,
		evaluationResult: result,
		isEvaluating,
		evaluationError: error,
		submitEvaluation,
		resetEvaluation: reset,
		addSuggestionAsTodo,
		evaluationHistory,
		historyLoading,
	};

	return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

export function useCoachContext(): CoachContextValue {
	const ctx = useContext(CoachContext);
	if (!ctx) {
		throw new Error("useCoachContext must be used within a CoachProvider");
	}
	return ctx;
}
