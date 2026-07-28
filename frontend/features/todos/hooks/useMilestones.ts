import { createApiClient } from "@/lib/swr/apiClient";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import useSWR from "swr";
import type { MilestoneEntry } from "../schemas/todoSchema";
import type { Milestone } from "../types";

// 更新可能なフィールド（title/label/測定値）。isCompletedは測定値から導出されるため直接更新しない。
type MilestoneUpdatableFields = Partial<
	Pick<Milestone, "title" | "label" | "startValue" | "currentValue" | "targetValue" | "unit">
>;

type UseMilestonesReturn = {
	milestones: Milestone[] | undefined;
	isLoading: boolean;
	error: Error | undefined;
	updateMilestone: (milestoneId: string, updates: MilestoneUpdatableFields) => Promise<Milestone>;
	createMilestones: (goalId: string, entries: MilestoneEntry[]) => Promise<Milestone[]>;
	// 現在値を手動更新する（＋更新ボタン）。完了状態はサーバがcurrent>=targetから再計算する。
	updateMilestoneProgress: (milestoneId: string, currentValue: number) => Promise<Milestone>;
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
		async (milestoneId: string, updates: MilestoneUpdatableFields): Promise<Milestone> => {
			const updated = await apiClient.patch<Milestone>(`/milestones/${milestoneId}`, updates);
			await mutate();
			return updated;
		},
		[apiClient, mutate],
	);

	const createMilestones = useCallback(
		async (targetGoalId: string, entries: MilestoneEntry[]): Promise<Milestone[]> => {
			const payload = entries.map((entry, idx) => ({
				id: entry.id,
				title: entry.title,
				label: entry.label,
				order: idx + 1,
				targetValue: entry.targetValue,
				unit: entry.unit,
				currentValue: entry.currentValue,
				startValue: entry.startValue,
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

	const updateMilestoneProgress = useCallback(
		async (milestoneId: string, currentValue: number): Promise<Milestone> => {
			const updated = await apiClient.patch<Milestone>(`/milestones/${milestoneId}`, {
				currentValue,
			});
			await mutate();
			return updated;
		},
		[apiClient, mutate],
	);

	return {
		milestones,
		isLoading: isLoading || !isLoaded,
		error,
		updateMilestone,
		createMilestones,
		updateMilestoneProgress,
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
