import type { SwrResponse } from "@/lib/swr/types";
import useSWR from "swr";

type Goal = {
	id: string;
	title: string;
	progress: number;
};

export function useGoals(isAuthenticated: boolean): SwrResponse<Goal[]> {
	const { data, error, isLoading, isValidating, mutate } = useSWR<Goal[]>(
		isAuthenticated ? "/api/goals" : null,
	);

	return { data, error, isLoading, isValidating, mutate };
}
