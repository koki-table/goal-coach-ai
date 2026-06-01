import { useCallback } from "react";
import useSWR from "swr";
import type { Milestone } from "../types";
import type { MilestoneLevelEnum } from "../schemas/todoSchema";

// モックデータ: 目標ごとのマイルストーン
const mockMilestonesStore: Record<string, Milestone[]> = {
	"goal-1": [
		{
			id: "milestone-1-1",
			goalId: "goal-1",
			title: "毎日30分の英語学習を習慣化",
			level: "short",
			order: 1,
			isCompleted: true,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
		{
			id: "milestone-1-2",
			goalId: "goal-1",
			title: "TOEIC模試で600点達成",
			level: "medium",
			order: 2,
			isCompleted: false,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
		{
			id: "milestone-1-3",
			goalId: "goal-1",
			title: "TOEIC本番で900点達成",
			level: "long",
			order: 3,
			isCompleted: false,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
	],
	"goal-2": [
		{
			id: "milestone-2-1",
			goalId: "goal-2",
			title: "週3回のジョギング習慣化",
			level: "short",
			order: 1,
			isCompleted: true,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
		{
			id: "milestone-2-2",
			goalId: "goal-2",
			title: "ハーフマラソン完走",
			level: "medium",
			order: 2,
			isCompleted: false,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
		{
			id: "milestone-2-3",
			goalId: "goal-2",
			title: "フルマラソン完走",
			level: "long",
			order: 3,
			isCompleted: false,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
	],
};

// ストアをクローン（メモリ内操作用）
let milestonesStore = JSON.parse(
	JSON.stringify(mockMilestonesStore),
) as typeof mockMilestonesStore;

type UseMilestonesReturn = {
	milestones: Milestone[] | undefined;
	isLoading: boolean;
	error: Error | undefined;
	updateMilestone: (
		milestoneId: string,
		updates: Partial<Pick<Milestone, "title" | "isCompleted">>,
	) => Promise<Milestone>;
	createMilestones: (
		goalId: string,
		milestones: Array<{
			title: string;
			level: (typeof MilestoneLevelEnum)[keyof typeof MilestoneLevelEnum];
		}>,
	) => Promise<Milestone[]>;
	toggleMilestoneComplete: (milestoneId: string) => Promise<void>;
};

export function useMilestones(goalId: string): UseMilestonesReturn {
	const {
		data: milestones,
		error,
		isLoading,
		mutate,
	} = useSWR<Milestone[]>(
		goalId ? `/api/goals/${goalId}/milestones` : null,
		async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return milestonesStore[goalId] || [];
		},
		{
			fallbackData: milestonesStore[goalId] || [],
			revalidateOnFocus: false,
		},
	);

	const updateMilestone = useCallback(
		async (
			milestoneId: string,
			updates: Partial<Pick<Milestone, "title" | "isCompleted">>,
		): Promise<Milestone> => {
			const goalMilestones = milestonesStore[goalId] || [];
			const index = goalMilestones.findIndex((m) => m.id === milestoneId);
			if (index === -1) throw new Error("マイルストーンが見つかりません");

			const updated = { ...goalMilestones[index], ...updates };
			milestonesStore[goalId][index] = updated;
			await mutate();
			return updated;
		},
		[goalId, mutate],
	);

	const createMilestones = useCallback(
		async (
			targetGoalId: string,
			newMilestones: Array<{
				title: string;
				level: (typeof MilestoneLevelEnum)[keyof typeof MilestoneLevelEnum];
			}>,
		): Promise<Milestone[]> => {
			const created: Milestone[] = newMilestones.map((m, idx) => ({
				id: `milestone-${targetGoalId}-${Date.now()}-${idx}`,
				goalId: targetGoalId,
				title: m.title,
				level: m.level,
				order: (idx + 1) as 1 | 2 | 3,
				isCompleted: false,
				createdAt: new Date().toISOString(),
			}));

			milestonesStore[targetGoalId] = created;
			await mutate();
			return created;
		},
		[mutate],
	);

	const toggleMilestoneComplete = useCallback(
		async (milestoneId: string): Promise<void> => {
			const goalMilestones = milestonesStore[goalId] || [];
			const index = goalMilestones.findIndex((m) => m.id === milestoneId);
			if (index === -1) return;

			milestonesStore[goalId][index] = {
				...milestonesStore[goalId][index],
				isCompleted: !milestonesStore[goalId][index].isCompleted,
			};
			await mutate();
		},
		[goalId, mutate],
	);

	return {
		milestones,
		isLoading,
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
	const { data, isLoading } = useSWR<Record<string, Milestone[]>>(
		"/api/milestones/all",
		async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return { ...milestonesStore };
		},
		{
			fallbackData: milestonesStore,
			revalidateOnFocus: false,
		},
	);

	return {
		milestonesMap: data || {},
		isLoading,
	};
}
