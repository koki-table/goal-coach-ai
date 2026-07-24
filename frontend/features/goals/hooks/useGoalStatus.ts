import { useCallback, useState } from "react";
import type { GoalStatusInput } from "../schemas/goalSchema";
import type { GoalStatus } from "../types";

export type UseGoalStatusReturn = {
	data: GoalStatus;
	isLoading: boolean;
	updateStatus: (input: GoalStatusInput) => Promise<GoalStatus>;
};

const DEFAULT_STATUS: GoalStatus = {
	goalId: "",
	progressPercent: 0,
	memo: "",
	obstacles: "",
};

export function useGoalStatus(goalId: string): UseGoalStatusReturn {
	const [status, setStatus] = useState<GoalStatus>({
		...DEFAULT_STATUS,
		goalId,
	});
	const [isLoading, setIsLoading] = useState(false);

	const updateStatus = useCallback(
		async (input: GoalStatusInput): Promise<GoalStatus> => {
			setIsLoading(true);
			try {
				const updated: GoalStatus = {
					...status,
					...input,
					goalId,
				};
				setStatus(updated);
				return updated;
			} finally {
				setIsLoading(false);
			}
		},
		[goalId, status],
	);

	return {
		data: status,
		isLoading,
		updateStatus,
	};
}
