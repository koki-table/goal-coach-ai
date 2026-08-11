"use client";

import { useSubscription } from "@/features/billing/hooks/useSubscription";
import type { SubscriptionTier } from "@/features/billing/types";
import { useGoals } from "@/features/goals/hooks/useGoals";
import type { Goal } from "@/features/goals/types";
import { createContext, useCallback, useContext } from "react";
import type { CoachErrorInfo } from "../helpers/coachErrorMessage.helper";
import type { ThreadTarget } from "../helpers/coachThreadTarget.helper";
import { useAdoptObjective } from "../hooks/useAdoptObjective";
import { useAdoptPlanItem } from "../hooks/useAdoptPlanItem";
import { useCoachConversation } from "../hooks/useCoachConversation";
import { useCoachMessages } from "../hooks/useCoachMessages";
import type { CoachMessage } from "../types";

type CoachContextValue = {
	goals: Goal[];
	goalsLoading: boolean;
	activeGoalCount: number;
	isGoalLimitReached: boolean;
	threadTarget: ThreadTarget;
	selectThread: (target: ThreadTarget) => void;
	conversationError: CoachErrorInfo | undefined;
	messages: CoachMessage[];
	isLoadingInitial: boolean;
	isLoadingMore: boolean;
	hasMore: boolean;
	loadMore: () => void;
	messagesError: CoachErrorInfo | undefined;
	sendMessage: (content: string) => Promise<boolean>;
	isSending: boolean;
	sendError: CoachErrorInfo | undefined;
	adoptKeyResult: (messageId: number, keyResultIndex: number) => Promise<void>;
	adoptTodo: (messageId: number, todoIndex: number) => Promise<void>;
	// 採用に成功すると新規作成されたgoalIdを返す
	adoptObjective: (messageId: number) => Promise<string | undefined>;
	adoptingKey: string | undefined;
	isAdoptingObjective: boolean;
	adoptError: CoachErrorInfo | undefined;
	// free tierのみUIで表示する残数バッジ用。proは"無制限"訴求を守るため常にundefined
	tier: SubscriptionTier;
	decidedMessagesRemainingToday: number | undefined;
};

const CoachContext = createContext<CoachContextValue | undefined>(undefined);

type CoachProviderProps = {
	children: React.ReactNode;
	threadTarget: ThreadTarget;
	onSelectThread: (target: ThreadTarget) => void;
	// MAX_ACTIVE_GOALS(goals featureのconfig値)の上限判定。coach featureは他featureの
	// configを直接importしない方針のため、呼び出し元(page.tsx)から渡す
	maxActiveGoals: number;
};

export function CoachProvider({
	children,
	threadTarget,
	onSelectThread,
	maxActiveGoals,
}: CoachProviderProps) {
	const { data: goals, isLoading: goalsLoading } = useGoals();
	const activeGoalCount = (goals ?? []).filter((g) => g.status === "active").length;
	const isGoalLimitReached = activeGoalCount >= maxActiveGoals;

	const { data: subscription } = useSubscription();
	const tier = subscription?.tier ?? "free";
	const decidedMessagesRemainingToday =
		tier === "free" && subscription
			? Math.max(subscription.freeDailyDecidedLimit - subscription.decidedMessagesUsedToday, 0)
			: undefined;

	const { conversation, isNew, error: conversationError } = useCoachConversation(threadTarget);

	const {
		messages,
		isLoadingInitial,
		isLoadingMore,
		hasMore,
		loadMore,
		messagesError,
		sendMessage,
		isSending,
		sendError,
		refresh,
	} = useCoachMessages(conversation?.id, { autoTriggerFirstTurn: isNew });

	const { adoptPlanItem, adoptingKey, error: adoptError } = useAdoptPlanItem(refresh);
	const {
		adoptObjective,
		isAdoptingObjective,
		error: adoptObjectiveError,
	} = useAdoptObjective(refresh);

	const adoptKeyResult = useCallback(
		async (messageId: number, keyResultIndex: number) => {
			await adoptPlanItem(messageId, { target: "keyResult", keyResultIndex });
		},
		[adoptPlanItem],
	);

	const adoptTodo = useCallback(
		async (messageId: number, todoIndex: number) => {
			await adoptPlanItem(messageId, { target: "todo", todoIndex });
		},
		[adoptPlanItem],
	);

	const value: CoachContextValue = {
		goals: goals ?? [],
		goalsLoading,
		activeGoalCount,
		isGoalLimitReached,
		threadTarget,
		selectThread: onSelectThread,
		conversationError,
		messages,
		isLoadingInitial,
		isLoadingMore,
		hasMore,
		loadMore,
		messagesError,
		sendMessage,
		isSending,
		sendError,
		adoptKeyResult,
		adoptTodo,
		adoptObjective,
		adoptingKey,
		isAdoptingObjective,
		adoptError: adoptError ?? adoptObjectiveError,
		tier,
		decidedMessagesRemainingToday,
	};

	return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

export function useCoachContext(): CoachContextValue {
	const ctx = useContext(CoachContext);
	if (!ctx) {
		throw new Error("useCoachContext must be used within a CoachProvider");
	}
	return ctx;
}
