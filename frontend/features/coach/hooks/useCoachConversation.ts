import { createApiClient } from "@/lib/swr/apiClient";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useMemo, useState } from "react";
import type { CoachErrorInfo } from "../helpers/coachErrorMessage.helper";
import { mapCoachError } from "../helpers/coachErrorMessage.helper";
import type { CoachConversation } from "../types";

export type UseCoachConversationReturn = {
	conversation: CoachConversation | undefined;
	isStarting: boolean;
	error: CoachErrorInfo | undefined;
	startConversation: (goalId: string) => Promise<CoachConversation | undefined>;
};

export function useCoachConversation(): UseCoachConversationReturn {
	const { getToken } = useAuth();
	// getTokenが安定しないとapiClientが毎レンダリング再生成され、これに依存するuseCallback/useEffectが
	// 無限に再発火する(startConversationをuseEffectで呼ぶ呼び出し元で顕在化した)。useMemoで参照を安定させる。
	const apiClient = useMemo(() => createApiClient(getToken), [getToken]);
	const [conversation, setConversation] = useState<CoachConversation | undefined>(undefined);
	const [isStarting, setIsStarting] = useState(false);
	const [error, setError] = useState<CoachErrorInfo | undefined>(undefined);

	const startConversation = useCallback(
		async (goalId: string): Promise<CoachConversation | undefined> => {
			setIsStarting(true);
			setError(undefined);
			try {
				const result = await apiClient.post<CoachConversation>("/coach/conversations", { goalId });
				setConversation(result);
				return result;
			} catch (e) {
				setError(mapCoachError(e));
				setConversation(undefined);
				return undefined;
			} finally {
				setIsStarting(false);
			}
		},
		[apiClient],
	);

	return { conversation, isStarting, error, startConversation };
}
