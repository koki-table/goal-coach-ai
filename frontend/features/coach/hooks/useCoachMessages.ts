import { createApiClient } from "@/lib/swr/apiClient";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useMemo, useState } from "react";
import useSWRInfinite from "swr/infinite";
import type { CoachErrorInfo } from "../helpers/coachErrorMessage.helper";
import { mapCoachError } from "../helpers/coachErrorMessage.helper";
import type { CoachMessage, CoachMessagePage } from "../types";

export type UseCoachMessagesReturn = {
	messages: CoachMessage[];
	isLoadingInitial: boolean;
	isLoadingMore: boolean;
	hasMore: boolean;
	loadMore: () => void;
	sendMessage: (content: string) => Promise<void>;
	isSending: boolean;
	sendError: CoachErrorInfo | undefined;
	refresh: () => Promise<void>;
};

export function useCoachMessages(conversationId: string | undefined): UseCoachMessagesReturn {
	const { getToken, isLoaded, isSignedIn } = useAuth();
	// apiClientの参照を安定させ、これに依存するuseCallbackが毎レンダリング再生成されるのを防ぐ
	const apiClient = useMemo(() => createApiClient(getToken), [getToken]);

	const getKey = (pageIndex: number, previousPageData: CoachMessagePage | null) => {
		if (!isLoaded || !isSignedIn || !conversationId) return null;
		if (previousPageData && !previousPageData.nextCursor) return null;
		const cursor = pageIndex === 0 ? undefined : previousPageData?.nextCursor;
		return `/coach/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ""}`;
	};

	const { data, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite<CoachMessagePage>(
		getKey,
		{ revalidateFirstPage: false },
	);

	// pagesは新しい順→古い順に並ぶため、表示は逆順に結合して古い→新しいにする
	const messages = useMemo(
		() => (data ? [...data].reverse().flatMap((page) => page.messages) : []),
		[data],
	);

	const hasMore = data ? !!data[data.length - 1]?.nextCursor : true;
	const loadMore = useCallback(() => setSize(size + 1), [size, setSize]);

	const [isSending, setIsSending] = useState(false);
	const [sendError, setSendError] = useState<CoachErrorInfo | undefined>(undefined);

	const sendMessage = useCallback(
		async (content: string): Promise<void> => {
			if (!conversationId) return;
			setIsSending(true);
			setSendError(undefined);
			try {
				await apiClient.post(`/coach/conversations/${conversationId}/messages`, { content });
				await mutate();
			} catch (e) {
				setSendError(mapCoachError(e));
			} finally {
				setIsSending(false);
			}
		},
		[apiClient, conversationId, mutate],
	);

	const refresh = useCallback(async () => {
		await mutate();
	}, [mutate]);

	return {
		messages,
		isLoadingInitial: !data && isLoading,
		isLoadingMore: isValidating,
		hasMore,
		loadMore,
		sendMessage,
		isSending,
		sendError,
		refresh,
	};
}
