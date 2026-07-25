"use client";

import { useEffect, useRef } from "react";
import type { CoachMessage } from "../types";
import { ChatMessageBubble } from "./chatMessageBubble";

type ChatMessageListProps = {
	messages: CoachMessage[];
	hasMore: boolean;
	isLoadingMore: boolean;
	onLoadMore: () => void;
	onAdoptMilestone: (messageId: number) => Promise<void>;
	onAdoptTodo: (messageId: number, todoIndex: number) => Promise<void>;
	adoptingKey: string | undefined;
};

export function ChatMessageList({
	messages,
	hasMore,
	isLoadingMore,
	onLoadMore,
	onAdoptMilestone,
	onAdoptTodo,
	adoptingKey,
}: ChatMessageListProps) {
	const topSentinelRef = useRef<HTMLDivElement>(null);

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

	return (
		<div className="flex flex-col gap-3 overflow-y-auto p-4">
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
		</div>
	);
}
