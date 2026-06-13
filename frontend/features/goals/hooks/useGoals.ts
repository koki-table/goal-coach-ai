import { createApiClient } from "@/lib/swr/apiClient";
import type { SwrResponse } from "@/lib/swr/types";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import useSWR from "swr";
import type { GoalInput } from "../schemas/goalSchema";
import type { Goal } from "../types";

export type UseGoalsReturn = SwrResponse<Goal[]> & {
	createGoal: (input: GoalInput) => Promise<Goal>;
	updateGoal: (id: string, input: Partial<GoalInput>) => Promise<Goal>;
	deleteGoal: (id: string) => Promise<void>;
};

export function useGoals(): UseGoalsReturn {
	const { getToken } = useAuth();
	const apiClient = createApiClient(getToken);

	const { data, error, isLoading, isValidating, mutate } = useSWR<Goal[]>("/goals");

	const createGoal = useCallback(
		async (input: GoalInput): Promise<Goal> => {
			const newGoal = await apiClient.post<Goal>("/goals", input);
			await mutate();
			return newGoal;
		},
		[apiClient, mutate],
	);

	const updateGoal = useCallback(
		async (id: string, input: Partial<GoalInput>): Promise<Goal> => {
			const updated = await apiClient.put<Goal>(`/goals/${id}`, input);
			await mutate();
			return updated;
		},
		[apiClient, mutate],
	);

	const deleteGoal = useCallback(
		async (id: string): Promise<void> => {
			await apiClient.del(`/goals/${id}`);
			await mutate();
		},
		[apiClient, mutate],
	);

	return {
		data,
		error,
		isLoading,
		isValidating,
		mutate: () => mutate(),
		createGoal,
		updateGoal,
		deleteGoal,
	};
}
