import { ApiClientError } from "@/lib/swr/apiClient";
import { useChat } from "@ai-sdk/react";
import { useAuth } from "@clerk/nextjs";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import type { CoachErrorInfo } from "../helpers/coachErrorMessage.helper";
import { mapCoachError } from "../helpers/coachErrorMessage.helper";
import { toStreamingDisplayMessage } from "../helpers/coachStreamMessage.helper";
import type { CoachMessage, CoachMessagePage } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787/api";

export type UseCoachMessagesReturn = {
	messages: CoachMessage[];
	isLoadingInitial: boolean;
	isLoadingMore: boolean;
	hasMore: boolean;
	loadMore: () => void;
	messagesError: CoachErrorInfo | undefined;
	sendMessage: (content: string) => Promise<boolean>;
	isSending: boolean;
	sendError: CoachErrorInfo | undefined;
	refresh: () => Promise<void>;
};

// useChatのDefaultChatTransportはfetchがres.ok===falseでも素のErrorしかthrowしないため、
// ステータスコード別の文言（429/502/503等）をmapCoachErrorで出し分けられない。
// レスポンスボディを読んでApiClientErrorに変換してからthrowし直す。
async function fetchAndThrowApiClientError(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const res = await fetch(input, init);
	if (res.ok) return res;

	let body: unknown;
	try {
		body = await res.clone().json();
	} catch {
		body = await res
			.clone()
			.text()
			.catch(() => null);
	}
	const message =
		body && typeof body === "object" && "message" in body
			? String((body as { message: unknown }).message)
			: `Request failed with status ${res.status}`;
	throw new ApiClientError(res.status, message, body);
}

export function useCoachMessages(conversationId: string | undefined): UseCoachMessagesReturn {
	const { getToken, isLoaded, isSignedIn } = useAuth();

	const getKey = (pageIndex: number, previousPageData: CoachMessagePage | null) => {
		if (!isLoaded || !isSignedIn || !conversationId) return null;
		if (previousPageData && !previousPageData.nextCursor) return null;
		const cursor = pageIndex === 0 ? undefined : previousPageData?.nextCursor;
		return `/coach/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ""}`;
	};

	const { data, size, setSize, isLoading, isValidating, mutate, error } =
		useSWRInfinite<CoachMessagePage>(getKey, { revalidateFirstPage: false });

	const messagesError = error ? mapCoachError(error) : undefined;

	// pagesは新しい順→古い順に並ぶため、表示は逆順に結合して古い→新しいにする
	const confirmedMessages = useMemo(
		() => (data ? [...data].reverse().flatMap((page) => page.messages) : []),
		[data],
	);

	const hasMore = data ? !!data[data.length - 1]?.nextCursor : true;
	const loadMore = useCallback(() => setSize(size + 1), [size, setSize]);

	const [sendError, setSendError] = useState<CoachErrorInfo | undefined>(undefined);

	// sendMessage()呼び出しごとに、対応するonFinish/onErrorの発火を待つためのresolver。
	// useChatのsendMessage自体は失敗時もrejectしない（内部でcatchしてstatus:"error"に
	// するだけ）ため、コールバック経由で完了・失敗を判定する。
	const pendingTurnRef = useRef<{
		resolve: (ok: boolean) => void;
	} | null>(null);

	// transportはconversationIdが変わるごとに作り直す。認証ヘッダーはリクエストごとに
	// getTokenで解決するresolvable形式（Resolvable<Record<string,string>>）を使う。
	const transport = useMemo(() => {
		if (!conversationId) return undefined;
		return new DefaultChatTransport({
			api: `${API_BASE_URL}/coach/conversations/${conversationId}/messages`,
			fetch: fetchAndThrowApiClientError,
			headers: async (): Promise<Record<string, string>> => {
				const token = await getToken();
				return token ? { Authorization: `Bearer ${token}` } : {};
			},
			// useChatのsendMessage({text})はUIMessage形式のbodyを組むが、
			// バックエンドはcoachMessageCreateSchemaの{content}を期待するため変換する。
			prepareSendMessagesRequest: ({ messages, api, headers, credentials }) => {
				const lastUserMessage = messages[messages.length - 1];
				const content = lastUserMessage?.parts
					.filter((part) => part.type === "text")
					.map((part) => (part as { type: "text"; text: string }).text)
					.join("");
				return { api, headers, credentials, body: { content } };
			},
		});
	}, [conversationId, getToken]);

	const {
		messages: streamMessages,
		sendMessage: sendChatMessage,
		status,
		setMessages: setStreamMessages,
	} = useChat({
		transport,
		onFinish: ({ isError }) => {
			pendingTurnRef.current?.resolve(!isError);
			pendingTurnRef.current = null;
		},
		onError: (chatError) => {
			setSendError(mapCoachError(chatError));
		},
	});

	const sendMessage = useCallback(
		async (content: string): Promise<boolean> => {
			if (!conversationId || !transport) return false;
			setSendError(undefined);

			const turnCompleted = new Promise<boolean>((resolve) => {
				pendingTurnRef.current = { resolve };
			});
			await sendChatMessage({ text: content });
			const ok = await turnCompleted;

			if (ok) {
				// ストリーム完了後に確定履歴を再取得し、streaming用の一時メッセージを消す。
				await mutate();
				setStreamMessages([]);
			}
			return ok;
		},
		[conversationId, transport, sendChatMessage, mutate, setStreamMessages],
	);

	// streaming中のuser/assistantメッセージを確定履歴の末尾に一時的に重ねて表示する。
	// 完了後はsendMessage内でsetStreamMessages([])しているため、ここには残らない。
	// assistantの最初のトークンが届くまでcontentが空文字列になる（Gemini実測で約1秒）ため、
	// 空のバブルを出さず、その間はisSendingでTypingIndicatorのみ表示する。
	const streamingDisplayMessages = useMemo(() => {
		if (!conversationId) return [];
		return streamMessages
			.map((m) => toStreamingDisplayMessage(m, conversationId))
			.filter((m): m is CoachMessage => m !== undefined && m.content.length > 0);
	}, [streamMessages, conversationId]);

	// text-startチャンク到着時点でtype:"text"のpartが空文字列で作られるため、
	// partの有無ではなくstreamingDisplayMessages（content非空でフィルタ済み）の
	// 有無で「最初のトークンがまだ届いていない」状態を判定する。
	const isSending =
		status === "submitted" ||
		(status === "streaming" && !streamingDisplayMessages.some((m) => m.role === "assistant"));

	const messages = useMemo(
		() => [...confirmedMessages, ...streamingDisplayMessages],
		[confirmedMessages, streamingDisplayMessages],
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
		messagesError,
		sendMessage,
		isSending,
		sendError,
		refresh,
	};
}
