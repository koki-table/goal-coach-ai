import { createApiClient } from "@/lib/swr/apiClient";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import useSWR from "swr";
import type { CoachErrorInfo } from "../helpers/coachErrorMessage.helper";
import { mapCoachError } from "../helpers/coachErrorMessage.helper";
import type { ThreadTarget } from "../helpers/coachThreadTarget.helper";
import type { CoachConversation } from "../types";

type CoachConversationWithIsNew = CoachConversation & { isNew: boolean };

export type UseCoachConversationReturn = {
	conversation: CoachConversation | undefined;
	// 探索スレッドが今回のリクエストで新規作成されたかどうか。trueの場合のみ
	// first-turnをトリガーして第一声を生成する(既存スレッド取得時はLLMを呼ばない)
	isNew: boolean;
	isStarting: boolean;
	error: CoachErrorInfo | undefined;
};

export function useCoachConversation(threadTarget: ThreadTarget): UseCoachConversationReturn {
	const { getToken } = useAuth();
	const apiClient = useMemo(() => createApiClient(getToken), [getToken]);

	const key = threadTarget ? ["coach-conversation", JSON.stringify(threadTarget)] : null;

	const { data, error, isLoading } = useSWR<CoachConversationWithIsNew>(key, async () => {
		if (!threadTarget) throw new Error("threadTarget is required");
		return threadTarget.kind === "goal"
			? apiClient.post<CoachConversationWithIsNew>("/coach/conversations", {
					goalId: threadTarget.goalId,
				})
			: apiClient.post<CoachConversationWithIsNew>("/coach/conversations/exploration", {});
	});

	// エラー時はdataが直前に選択していた別スレッドの古いconversationを指したままになる
	// (SWRはkeyが変わってもエラー発生時に前回の成功データを保持するため)。
	// 古いconversationIdに紐づくメッセージ履歴が誤って表示され続けるのを防ぐため、
	// エラー時は明示的にundefinedにする
	const conversation = error ? undefined : data;

	return {
		conversation,
		isNew: conversation?.isNew ?? false,
		isStarting: isLoading,
		error: error ? mapCoachError(error) : undefined,
	};
}
