import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import type { CoachEvaluationHistoryItem } from "../types";

type UseCoachEvaluationHistoryReturn = {
	history: CoachEvaluationHistoryItem[];
	isLoading: boolean;
	error: Error | undefined;
	mutate: () => void;
};

export function useCoachEvaluationHistory(
	goalId: string | undefined,
): UseCoachEvaluationHistoryReturn {
	const { isLoaded, isSignedIn } = useAuth();

	const { data, error, isLoading, mutate } = useSWR<CoachEvaluationHistoryItem[]>(
		isLoaded && isSignedIn && goalId ? `/coach/evaluations/${goalId}` : null,
	);

	return {
		history: data ?? [],
		isLoading: isLoading || !isLoaded,
		error,
		mutate,
	};
}
