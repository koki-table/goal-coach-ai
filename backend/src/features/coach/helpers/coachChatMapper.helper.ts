import type {
	CoachConversationResponse,
	CoachMessageResponse,
	CoachMessageRoleValue,
	PlanProposalPayload,
} from "../../../types/api";

export function mapConversationToResponse(conversation: {
	id: string;
	goalId: string | null;
	goalTitleSnapshot: string;
	goalDeadlineSnapshot: string | null;
	createdAt: string;
	updatedAt: string;
}): CoachConversationResponse {
	return {
		id: conversation.id,
		goalId: conversation.goalId ?? undefined,
		goalTitleSnapshot: conversation.goalTitleSnapshot,
		goalDeadlineSnapshot: conversation.goalDeadlineSnapshot ?? undefined,
		createdAt: conversation.createdAt,
		updatedAt: conversation.updatedAt,
	};
}

export function mapMessageToResponse(message: {
	id: number;
	conversationId: string;
	role: string;
	content: string;
	proposal: string | null;
	createdAt: string;
}): CoachMessageResponse {
	return {
		id: message.id,
		conversationId: message.conversationId,
		role: message.role as CoachMessageRoleValue,
		content: message.content,
		proposal: message.proposal ? (JSON.parse(message.proposal) as PlanProposalPayload) : undefined,
		createdAt: message.createdAt,
	};
}
