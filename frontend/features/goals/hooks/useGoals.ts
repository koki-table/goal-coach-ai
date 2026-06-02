import { useCallback, useState } from "react";
import useSWR from "swr";
import type { SwrResponse } from "@/lib/swr/types";
import { GoalCategory } from "../schemas/goalSchema";
import type { Goal } from "../types";
import type { GoalInput } from "../schemas/goalSchema";

// モックデータ
const initialMockGoals: Goal[] = [
	{
		id: "goal-1",
		title: "TOEIC 900点を取得する",
		description:
			"現在のスコア650点から900点を目指す。毎日2時間の学習を継続し、半年後の試験で目標達成。",
		deadline: "2027-01-15",
		category: GoalCategory.STUDY,
		createdAt: "2026-05-01T00:00:00.000Z",
		updatedAt: "2026-05-20T00:00:00.000Z",
	},
	{
		id: "goal-2",
		title: "フルマラソン完走",
		description:
			"健康維持と自己挑戦のため、来年の東京マラソンでフルマラソンを完走する。",
		deadline: "2027-03-01",
		category: GoalCategory.HEALTH,
		createdAt: "2026-04-15T00:00:00.000Z",
		updatedAt: "2026-05-18T00:00:00.000Z",
	},
	{
		id: "goal-3",
		title: "AWS認定ソリューションアーキテクト取得",
		description:
			"クラウドスキルを証明するため、AWS SAA-C03に合格する。実務経験を活かしつつ体系的に学習。",
		deadline: "2026-09-30",
		category: GoalCategory.CAREER,
		createdAt: "2026-05-10T00:00:00.000Z",
		updatedAt: "2026-05-22T00:00:00.000Z",
	},
];

// ローカルストレージのモック（実際はuseStateで管理）
let mockGoalsStore = [...initialMockGoals];

// モックフェッチャー
const mockFetcher = (): Promise<Goal[]> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve([...mockGoalsStore]);
		}, 300);
	});
};

export type UseGoalsReturn = SwrResponse<Goal[]> & {
	createGoal: (input: GoalInput) => Promise<Goal>;
	updateGoal: (id: string, input: Partial<GoalInput>) => Promise<Goal>;
	deleteGoal: (id: string) => Promise<void>;
};

export function useGoals(): UseGoalsReturn {
	const [isCreating, setIsCreating] = useState(false);

	const { data, error, isLoading, isValidating, mutate } = useSWR<Goal[]>(
		"/api/goals",
		mockFetcher,
		{
			fallbackData: mockGoalsStore,
			revalidateOnFocus: false,
		},
	);

	const createGoal = useCallback(
		async (input: GoalInput): Promise<Goal> => {
			setIsCreating(true);
			try {
				const newGoal: Goal = {
					...input,
					id: `goal-${Date.now()}`,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};
				mockGoalsStore = [...mockGoalsStore, newGoal];
				await mutate();
				return newGoal;
			} finally {
				setIsCreating(false);
			}
		},
		[mutate],
	);

	const updateGoal = useCallback(
		async (id: string, input: Partial<GoalInput>): Promise<Goal> => {
			const existingGoal = mockGoalsStore.find((g) => g.id === id);
			if (!existingGoal) {
				throw new Error("目標が見つかりません");
			}

			const updatedGoal: Goal = {
				...existingGoal,
				...input,
				updatedAt: new Date().toISOString(),
			};
			mockGoalsStore = mockGoalsStore.map((g) =>
				g.id === id ? updatedGoal : g,
			);
			await mutate();
			return updatedGoal;
		},
		[mutate],
	);

	const deleteGoal = useCallback(
		async (id: string): Promise<void> => {
			mockGoalsStore = mockGoalsStore.filter((g) => g.id !== id);
			await mutate();
		},
		[mutate],
	);

	return {
		data,
		error,
		isLoading: isLoading || isCreating,
		isValidating,
		mutate: () => mutate(),
		createGoal,
		updateGoal,
		deleteGoal,
	};
}
