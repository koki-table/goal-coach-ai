import { createApiClient } from "@/lib/swr/apiClient";
import { revalidateByPrefix, revalidateKey } from "@/lib/swr/mutate";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useMemo, useState } from "react";
import type { CoachErrorInfo } from "../helpers/coachErrorMessage.helper";
import { mapCoachError } from "../helpers/coachErrorMessage.helper";
import type { AdoptPlanItemTarget } from "../types";

export type UseAdoptPlanItemReturn = {
	adoptPlanItem: (messageId: number, target: AdoptPlanItemTarget) => Promise<void>;
	adoptingKey: string | undefined;
	error: CoachErrorInfo | undefined;
};

function toKey(messageId: number, target: AdoptPlanItemTarget): string {
	if (target.target === "keyResult") return `${messageId}:kr:${target.keyResultIndex}`;
	if (target.target === "todo") return `${messageId}:todo:${target.todoIndex}`;
	return `${messageId}:mu:${target.milestoneUpdateIndex}`;
}

export function useAdoptPlanItem(onAdopted: () => Promise<void>): UseAdoptPlanItemReturn {
	const { getToken } = useAuth();
	// apiClientの参照を安定させ、これに依存するuseCallbackが毎レンダリング再生成されるのを防ぐ
	const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
	const [adoptingKey, setAdoptingKey] = useState<string | undefined>(undefined);
	const [error, setError] = useState<CoachErrorInfo | undefined>(undefined);

	const adoptPlanItem = useCallback(
		async (messageId: number, target: AdoptPlanItemTarget): Promise<void> => {
			setAdoptingKey(toKey(messageId, target));
			setError(undefined);
			try {
				await apiClient.post(`/coach/messages/${messageId}/adopt-plan-item`, target);
				// マイルストーン/TODO一覧側のキャッシュを再検証し、他ページの表示にも反映する
				await Promise.all([
					revalidateByPrefix("/goals"),
					revalidateKey("/todos"),
					revalidateKey("/milestones/all"),
				]);
				await onAdopted();
			} catch (e) {
				setError(mapCoachError(e));
			} finally {
				setAdoptingKey(undefined);
			}
		},
		[apiClient, onAdopted],
	);

	return { adoptPlanItem, adoptingKey, error };
}
