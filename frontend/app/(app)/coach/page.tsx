"use client";

import { Skeleton } from "@/components/atom/skeleton";
import { ChatInputBar } from "@/features/coach/components/chatInputBar";
import { ChatMessageList } from "@/features/coach/components/chatMessageList";
import { GoalThreadList } from "@/features/coach/components/goalThreadList";
import { CoachProvider, useCoachContext } from "@/features/coach/contexts/coachContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CoachPageContent() {
	const {
		goals,
		goalsLoading,
		selectedGoalId,
		selectGoal,
		conversationError,
		messages,
		isLoadingInitial,
		isLoadingMore,
		hasMore,
		loadMore,
		messagesError,
		sendMessage,
		isSending,
		adoptMilestone,
		adoptTodo,
		adoptingKey,
	} = useCoachContext();

	const threadError = conversationError ?? messagesError;

	if (goalsLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-40" />
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col space-y-4">
			<div className="space-y-1">
				<h2 className="text-2xl font-bold tracking-tight">AIコーチ ペンタ君</h2>
				<p className="text-muted-foreground">
					目標について、AIコーチ ペンタ君と対話しながら計画を立てられます。
				</p>
			</div>

			<div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[240px_1fr]">
				<GoalThreadList
					goals={goals.map((g) => ({ id: g.id, title: g.title }))}
					selectedGoalId={selectedGoalId}
					onSelectGoal={selectGoal}
				/>

				{selectedGoalId ? (
					<div className="flex min-h-0 flex-col rounded-xl border">
						{threadError ? (
							<p className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
								{threadError.message}
							</p>
						) : null}
						{isLoadingInitial ? (
							<div className="flex-1 p-4">
								<Skeleton className="h-full w-full" />
							</div>
						) : (
							<ChatMessageList
								messages={messages}
								hasMore={hasMore}
								isLoadingMore={isLoadingMore}
								isSending={isSending}
								onLoadMore={loadMore}
								onAdoptMilestone={adoptMilestone}
								onAdoptTodo={adoptTodo}
								adoptingKey={adoptingKey}
							/>
						)}
						<ChatInputBar onSend={sendMessage} disabled={isSending} />
					</div>
				) : (
					<div className="flex min-h-0 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
						<span className="md:hidden">上の一覧から目標を選択してください</span>
						<span className="hidden md:inline">左の一覧から目標を選択してください</span>
					</div>
				)}
			</div>
		</div>
	);
}

function CoachPageWithParams() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const goalId = searchParams.get("goalId") ?? undefined;

	const selectGoal = (id: string) => {
		router.push(`/coach?goalId=${id}`);
	};

	return (
		<CoachProvider selectedGoalId={goalId} onSelectGoal={selectGoal}>
			<CoachPageContent />
		</CoachProvider>
	);
}

export default function CoachPage() {
	return (
		<Suspense fallback={<Skeleton className="h-96 w-full" />}>
			<CoachPageWithParams />
		</Suspense>
	);
}
