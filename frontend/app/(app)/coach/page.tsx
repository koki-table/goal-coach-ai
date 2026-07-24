"use client";

import { Skeleton } from "@/components/atom/skeleton";
import { CoachErrorAlert } from "@/features/coach/components/coachErrorAlert";
import { CoachEvaluateForm } from "@/features/coach/components/coachEvaluateForm";
import { CoachEvaluationHistoryPanel } from "@/features/coach/components/coachEvaluationHistoryPanel";
import { CoachResultCard } from "@/features/coach/components/coachResultCard";
import { GoalSelector } from "@/features/coach/components/goalSelector";
import { CoachProvider, useCoachContext } from "@/features/coach/contexts/coachContext";

function CoachPageContent() {
	const {
		goals,
		goalsLoading,
		selectedGoalId,
		selectGoal,
		autoProgressPercent,
		evaluationResult,
		isEvaluating,
		evaluationError,
		submitEvaluation,
		addSuggestionAsTodo,
		evaluationHistory,
		historyLoading,
	} = useCoachContext();

	if (goalsLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-40" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h2 className="text-2xl font-bold tracking-tight">AIコーチ</h2>
				<p className="text-muted-foreground">AIコーチとの対話で目標達成を加速します。</p>
			</div>

			<GoalSelector goals={goals} selectedGoalId={selectedGoalId} onSelectGoal={selectGoal} />

			{selectedGoalId && (
				<CoachEvaluateForm
					autoProgressPercent={autoProgressPercent}
					onSubmit={submitEvaluation}
					isLoading={isEvaluating}
				/>
			)}

			{evaluationError && <CoachErrorAlert message={evaluationError.message} />}

			{evaluationResult && (
				<CoachResultCard
					feedback={evaluationResult.feedback}
					successRate={evaluationResult.successRate}
					actionableSuggestions={evaluationResult.actionableSuggestions}
					onAddSuggestion={addSuggestionAsTodo}
				/>
			)}

			{selectedGoalId && (
				<CoachEvaluationHistoryPanel history={evaluationHistory} isLoading={historyLoading} />
			)}
		</div>
	);
}

export default function CoachPage() {
	return (
		<CoachProvider>
			<CoachPageContent />
		</CoachProvider>
	);
}
