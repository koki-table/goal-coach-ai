import { createApiClient } from "@/lib/swr/apiClient";
import { revalidateByPrefix, revalidateKey } from "@/lib/swr/mutate";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useMemo, useState } from "react";
import type { CoachErrorInfo } from "../helpers/coachErrorMessage.helper";
import { mapCoachError } from "../helpers/coachErrorMessage.helper";

type AdoptObjectiveResponse = {
	goal: { id: string };
};

export type UseAdoptObjectiveReturn = {
	// 採用に成功すると新規作成されたgoalIdを返す(呼び出し元がそのgoalスレッドへ遷移するため)
	adoptObjective: (messageId: number) => Promise<string | undefined>;
	isAdoptingObjective: boolean;
	error: CoachErrorInfo | undefined;
};

export function useAdoptObjective(onAdopted: () => Promise<void>): UseAdoptObjectiveReturn {
	const { getToken } = useAuth();
	const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
	const [isAdoptingObjective, setIsAdoptingObjective] = useState(false);
	const [error, setError] = useState<CoachErrorInfo | undefined>(undefined);

	const adoptObjective = useCallback(
		async (messageId: number): Promise<string | undefined> => {
			setIsAdoptingObjective(true);
			setError(undefined);
			try {
				const result = await apiClient.post<AdoptObjectiveResponse>(
					`/coach/messages/${messageId}/adopt-objective`,
					{},
				);
				// 新規goalが作られるため、目標一覧のキャッシュも再検証する
				await Promise.all([revalidateByPrefix("/goals"), revalidateKey("/milestones/all")]);
				await onAdopted();
				return result.goal.id;
			} catch (e) {
				setError(mapCoachError(e));
				return undefined;
			} finally {
				setIsAdoptingObjective(false);
			}
		},
		[apiClient, onAdopted],
	);

	return { adoptObjective, isAdoptingObjective, error };
}
