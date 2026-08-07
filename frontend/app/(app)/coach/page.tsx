"use client";

import { Skeleton } from "@/components/atom/skeleton";
import { ChatInputBar } from "@/features/coach/components/chatInputBar";
import { ChatMessageList } from "@/features/coach/components/chatMessageList";
import { GoalThreadList } from "@/features/coach/components/goalThreadList";
import { MAX_ACTIVE_GOALS } from "@/features/coach/config/coachConfig";
import { CoachProvider, useCoachContext } from "@/features/coach/contexts/coachContext";
import {
	parseThreadTarget,
	shouldStartExploration,
} from "@/features/coach/helpers/coachThreadTarget.helper";
import type { ThreadTarget } from "@/features/coach/helpers/coachThreadTarget.helper";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function CoachPageContent() {
	const {
		goals,
		goalsLoading,
		isGoalLimitReached,
		threadTarget,
		selectThread,
		conversationError,
		messages,
		isLoadingInitial,
		isLoadingMore,
		hasMore,
		loadMore,
		messagesError,
		sendMessage,
		isSending,
		adoptKeyResult,
		adoptTodo,
		adoptObjective,
		adoptingKey,
		isAdoptingObjective,
	} = useCoachContext();

	const router = useRouter();

	// 目標0件でスレッド未指定の場合、初回のみ探索スレッドへ自動遷移する。
	// データフェッチ結果に基づく初回ナビゲーションであり、props→state同期ではない
	useEffect(() => {
		if (!goalsLoading && !threadTarget && shouldStartExploration(goals)) {
			router.replace("/coach?thread=exploration");
		}
	}, [goalsLoading, threadTarget, goals, router]);

	// Objective採用後、探索スレッドは採用先のgoalスレッドへ遷移する(サーバー側でも
	// conversation.kindがexploration→goalへ変わるため、URLも追従させて整合させる)。
	// これをしないと同じ探索スレッドで再度adopt-objectiveを試みるURLに留まってしまう
	const handleAdoptObjective = async (messageId: number) => {
		const goalId = await adoptObjective(messageId);
		if (goalId) {
			router.push(`/coach?goalId=${goalId}`);
		}
	};

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
					selectedThread={threadTarget}
					onSelectGoal={(goalId) => selectThread({ kind: "goal", goalId })}
					onSelectExploration={() => selectThread({ kind: "exploration" })}
				/>

				{threadTarget ? (
					<div className="flex min-h-0 flex-col rounded-xl border">
						{threadError ? (
							<p
								className={
									conversationError
										? "rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive"
										: "rounded-t-xl border-b bg-destructive/10 px-4 py-2 text-sm text-destructive"
								}
							>
								{threadError.message}
							</p>
						) : null}
						{conversationError ? null : isLoadingInitial ? (
							<div className="flex-1 p-4">
								<Skeleton className="h-full w-full" />
							</div>
						) : (
							<>
								<ChatMessageList
									messages={messages}
									hasMore={hasMore}
									isLoadingMore={isLoadingMore}
									isSending={isSending}
									onLoadMore={loadMore}
									onAdoptKeyResult={adoptKeyResult}
									onAdoptTodo={adoptTodo}
									onAdoptObjective={handleAdoptObjective}
									adoptingKey={adoptingKey}
									isAdoptingObjective={isAdoptingObjective}
									isGoalLimitReached={isGoalLimitReached}
								/>
								<ChatInputBar onSend={sendMessage} disabled={isSending} />
							</>
						)}
					</div>
				) : (
					<div className="flex min-h-0 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
						<span className="md:hidden">上の一覧から選択してください</span>
						<span className="hidden md:inline">左の一覧から選択してください</span>
					</div>
				)}
			</div>
		</div>
	);
}

function CoachPageWithParams() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const threadTarget = parseThreadTarget(searchParams);

	const selectThread = (target: ThreadTarget) => {
		if (!target) return;
		const query = target.kind === "goal" ? `goalId=${target.goalId}` : "thread=exploration";
		router.push(`/coach?${query}`);
	};

	return (
		<CoachProvider
			threadTarget={threadTarget}
			onSelectThread={selectThread}
			maxActiveGoals={MAX_ACTIVE_GOALS}
		>
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
