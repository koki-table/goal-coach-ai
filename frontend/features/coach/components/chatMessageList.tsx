"use client";

import { Avatar, AvatarImage } from "@/components/atom/avatar";
import { useEffect, useRef } from "react";
import { AUTO_SCROLL_THRESHOLD_PX } from "../config/coachConfig";
import type { CoachMessage } from "../types";
import { ChatMessageBubble } from "./chatMessageBubble";
import { TypingIndicator } from "./typingIndicator";

type ChatMessageListProps = {
	messages: CoachMessage[];
	hasMore: boolean;
	isLoadingMore: boolean;
	isSending: boolean;
	onLoadMore: () => void;
	onAdoptMilestone: (messageId: number) => Promise<void>;
	onAdoptTodo: (messageId: number, todoIndex: number) => Promise<void>;
	adoptingKey: string | undefined;
};

export function ChatMessageList({
	messages,
	hasMore,
	isLoadingMore,
	isSending,
	onLoadMore,
	onAdoptMilestone,
	onAdoptTodo,
	adoptingKey,
}: ChatMessageListProps) {
	const topSentinelRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const isNearBottomRef = useRef(true);
	const prevLengthRef = useRef(0);
	const lastMessageIdRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		const sentinel = topSentinelRef.current;
		if (!sentinel || !hasMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !isLoadingMore) {
					onLoadMore();
				}
			},
			{ threshold: 0 },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMore, isLoadingMore, onLoadMore]);

	const handleScroll = () => {
		const el = containerRef.current;
		if (!el) return;
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		isNearBottomRef.current = distanceFromBottom <= AUTO_SCROLL_THRESHOLD_PX;
	};

	// 初期表示(会話切替時含む)では即座に最下部へ、新規メッセージ到達時は
	// ユーザーが最下部付近にいる場合のみスムーズスクロールする。
	// 過去ログの追加読み込み(先頭に古いメッセージが挿入される)では末尾idが変わらないため発火しない。
	useEffect(() => {
		if (messages.length === 0) {
			prevLengthRef.current = 0;
			lastMessageIdRef.current = undefined;
			return;
		}

		const lastMessage = messages[messages.length - 1];
		const wasEmpty = prevLengthRef.current === 0;
		const isNewLastMessage = lastMessageIdRef.current !== lastMessage.id;

		if (wasEmpty) {
			bottomRef.current?.scrollIntoView({ behavior: "auto" });
		} else if (isNewLastMessage && isNearBottomRef.current) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}

		prevLengthRef.current = messages.length;
		lastMessageIdRef.current = lastMessage.id;
	}, [messages]);

	return (
		<div
			ref={containerRef}
			onScroll={handleScroll}
			className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
		>
			{hasMore && (
				<div ref={topSentinelRef} className="py-2 text-center text-xs text-muted-foreground">
					{isLoadingMore ? "読み込み中..." : ""}
				</div>
			)}
			{messages.length === 0 && (
				<p className="text-center text-sm text-muted-foreground">
					まずはメッセージを送ってみましょう。
				</p>
			)}
			{messages.map((message) => (
				<ChatMessageBubble
					key={message.id}
					message={message}
					onAdoptMilestone={onAdoptMilestone}
					onAdoptTodo={onAdoptTodo}
					adoptingKey={adoptingKey}
				/>
			))}
			{isSending && (
				<div className="flex items-start gap-2">
					<Avatar size="lg" className="shrink-0">
						<AvatarImage src="/penguin-talk.png" alt="AIコーチ" />
					</Avatar>
					<div className="rounded-xl bg-muted px-4 py-2">
						<TypingIndicator />
					</div>
				</div>
			)}
			<div ref={bottomRef} />
		</div>
	);
}
