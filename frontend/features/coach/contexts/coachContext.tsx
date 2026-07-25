"use client";

import { useGoals } from "@/features/goals/hooks/useGoals";
import type { Goal } from "@/features/goals/types";
import { createContext, useCallback, useContext, useEffect } from "react";
import type { CoachErrorInfo } from "../helpers/coachErrorMessage.helper";
import { useAdoptPlanItem } from "../hooks/useAdoptPlanItem";
import { useCoachConversation } from "../hooks/useCoachConversation";
import { useCoachMessages } from "../hooks/useCoachMessages";
import type { CoachMessage } from "../types";

type CoachContextValue = {
	goals: Goal[];
	goalsLoading: boolean;
	selectedGoalId: string | undefined;
	selectGoal: (goalId: string) => void;
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
	adoptMilestone: (messageId: number) => Promise<void>;
	adoptTodo: (messageId: number, todoIndex: number) => Promise<void>;
	adoptingKey: string | undefined;
	adoptError: CoachErrorInfo | undefined;
};

const CoachContext = createContext<CoachContextValue | undefined>(undefined);

type CoachProviderProps = {
	children: React.ReactNode;
	selectedGoalId: string | undefined;
	onSelectGoal: (goalId: string) => void;
};

export function CoachProvider({ children, selectedGoalId, onSelectGoal }: CoachProviderProps) {
	const { data: goals, isLoading: goalsLoading } = useGoals();
	const { conversation, error: conversationError, startConversation } = useCoachConversation();

	useEffect(() => {
		if (selectedGoalId) {
			startConversation(selectedGoalId);
		}
	}, [selectedGoalId, startConversation]);

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
	} = useCoachMessages(conversation?.id);

	const { adoptPlanItem, adoptingKey, error: adoptError } = useAdoptPlanItem(refresh);

	const adoptMilestone = useCallback(
		async (messageId: number) => {
			await adoptPlanItem(messageId, { target: "milestone" });
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
		selectedGoalId,
		selectGoal: onSelectGoal,
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
		adoptMilestone,
		adoptTodo,
		adoptingKey,
		adoptError,
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
