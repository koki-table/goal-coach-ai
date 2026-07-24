import { createApiClient } from "@/lib/swr/apiClient";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import type { CoachErrorInfo } from "../helpers/coachErrorMessage.helper";
import { mapCoachError } from "../helpers/coachErrorMessage.helper";
import type { CoachEvaluateInput } from "../schemas/coachSchema";
import type { CoachEvaluationResult } from "../types";

export type UseCoachEvaluationReturn = {
	result: CoachEvaluationResult | undefined;
	isEvaluating: boolean;
	error: CoachErrorInfo | undefined;
	evaluate: (input: CoachEvaluateInput) => Promise<CoachEvaluationResult | undefined>;
	reset: () => void;
};

export function useCoachEvaluation(): UseCoachEvaluationReturn {
	const { getToken } = useAuth();
	const apiClient = createApiClient(getToken);
	const [result, setResult] = useState<CoachEvaluationResult | undefined>(undefined);
	const [isEvaluating, setIsEvaluating] = useState(false);
	const [error, setError] = useState<CoachErrorInfo | undefined>(undefined);

	const evaluate = useCallback(
		async (input: CoachEvaluateInput): Promise<CoachEvaluationResult | undefined> => {
			setIsEvaluating(true);
			setError(undefined);
			try {
				const evaluation = await apiClient.post<CoachEvaluationResult>("/coach/evaluate", input);
				setResult(evaluation);
				return evaluation;
			} catch (e) {
				setError(mapCoachError(e));
				return undefined;
			} finally {
				setIsEvaluating(false);
			}
		},
		[apiClient],
	);

	const reset = useCallback(() => {
		setResult(undefined);
		setError(undefined);
	}, []);

	return { result, isEvaluating, error, evaluate, reset };
}
