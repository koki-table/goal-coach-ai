import { createApiClient } from "@/lib/swr/apiClient";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import useSWR from "swr";
import type { MilestoneEntry } from "../schemas/todoSchema";
import type { Milestone } from "../types";

type UseMilestonesReturn = {
	milestones: Milestone[] | undefined;
	isLoading: boolean;
	error: Error | undefined;
	updateMilestone: (
		milestoneId: string,
		updates: Partial<Pick<Milestone, "title" | "isCompleted">>,
	) => Promise<Milestone>;
	createMilestones: (goalId: string, entries: MilestoneEntry[]) => Promise<Milestone[]>;
	toggleMilestoneComplete: (milestoneId: string) => Promise<void>;
};

export function useMilestones(goalId: string): UseMilestonesReturn {
	const { getToken, isLoaded, isSignedIn } = useAuth();
	const apiClient = createApiClient(getToken);

	const {
		data: milestones,
		error,
		isLoading,
		mutate,
	} = useSWR<Milestone[]>(isLoaded && isSignedIn && goalId ? `/goals/${goalId}/milestones` : null);

	const updateMilestone = useCallback(
		async (
			milestoneId: string,
			updates: Partial<Pick<Milestone, "title" | "isCompleted">>,
		): Promise<Milestone> => {
			const updated = await apiClient.patch<Milestone>(`/milestones/${milestoneId}`, updates);
			await mutate();
			return updated;
		},
		[apiClient, mutate],
	);

	const createMilestones = useCallback(
		async (targetGoalId: string, entries: MilestoneEntry[]): Promise<Milestone[]> => {
			const payload = entries.map((entry, idx) => ({
				title: entry.title,
				label: entry.label,
				order: idx + 1,
			}));
			const created = await apiClient.put<Milestone[]>(
				`/goals/${targetGoalId}/milestones`,
				payload,
			);
			await mutate();
			return created;
		},
		[apiClient, mutate],
	);

	const toggleMilestoneComplete = useCallback(
		async (milestoneId: string): Promise<void> => {
			const current = milestones?.find((m) => m.id === milestoneId);
			if (!current) return;

			await apiClient.patch(`/milestones/${milestoneId}`, {
				isCompleted: !current.isCompleted,
			});
			await mutate();
		},
		[apiClient, milestones, mutate],
	);

	return {
		milestones,
		isLoading: isLoading || !isLoaded,
		error,
		updateMilestone,
		createMilestones,
		toggleMilestoneComplete,
	};
}

// 全目標のマイルストーンを取得するフック
export function useAllMilestones(): {
	milestonesMap: Record<string, Milestone[]>;
	isLoading: boolean;
} {
	const { isLoaded, isSignedIn } = useAuth();
	const { data, isLoading } = useSWR<Record<string, Milestone[]>>(
		isLoaded && isSignedIn ? "/milestones/all" : null,
	);

	return {
		milestonesMap: data ?? {},
		isLoading: isLoading || !isLoaded,
	};
}
