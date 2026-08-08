import type {
	CoachConversationResponse,
	CoachMessageResponse,
	CoachMessageRoleValue,
	ObjectiveStatusValue,
} from "../../../types/api";
import { parseProposalPayload } from "./coachProposal.helper";

export function mapConversationToResponse(conversation: {
	id: string;
	goalId: string | null;
	objectiveStatus: string;
	goalTitleSnapshot: string;
	goalDeadlineSnapshot: string | null;
	createdAt: string;
	updatedAt: string;
}): CoachConversationResponse {
	return {
		id: conversation.id,
		goalId: conversation.goalId ?? undefined,
		objectiveStatus: conversation.objectiveStatus as ObjectiveStatusValue,
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
		proposal: message.proposal ? parseProposalPayload(message.proposal) : undefined,
		createdAt: message.createdAt,
	};
}
