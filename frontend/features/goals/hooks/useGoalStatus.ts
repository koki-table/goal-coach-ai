import type { SwrResponse } from "@/lib/swr/types";
import { useCallback, useState } from "react";
import type { GoalStatusInput } from "../schemas/goalSchema";
import type { GoalStatus } from "../types";

export type UseGoalStatusReturn = SwrResponse<GoalStatus> & {
	updateStatus: (input: GoalStatusInput) => Promise<GoalStatus>;
	requestAiReview: () => Promise<GoalStatus>;
};

const DEFAULT_STATUS: GoalStatus = {
	goalId: "",
	progressPercent: 0,
	memo: "",
	obstacles: "",
	achievementProbability: 0,
	coachFeedback: "AI分析機能は準備中です。",
	velocity: 0,
};

export function useGoalStatus(goalId: string): UseGoalStatusReturn {
	const [status, setStatus] = useState<GoalStatus>({
		...DEFAULT_STATUS,
		goalId,
	});
	const [isLoading, setIsLoading] = useState(false);

	const updateStatus = useCallback(
		async (input: GoalStatusInput): Promise<GoalStatus> => {
			const updated: GoalStatus = {
				...status,
				...input,
				goalId,
			};
			setStatus(updated);
			return updated;
		},
		[goalId, status],
	);

	// AI レビューはダミー
	const requestAiReview = useCallback(async (): Promise<GoalStatus> => {
		setIsLoading(true);
		try {
			await new Promise((resolve) => setTimeout(resolve, 500));
			const updated: GoalStatus = {
				...status,
				coachFeedback: "AI分析機能は現在準備中です。今後のアップデートでご利用いただけます。",
			};
			setStatus(updated);
			return updated;
		} finally {
			setIsLoading(false);
		}
	}, [status]);

	return {
		data: status,
		error: undefined,
		isLoading,
		isValidating: false,
		mutate: () => Promise.resolve(),
		updateStatus,
		requestAiReview,
	};
}
