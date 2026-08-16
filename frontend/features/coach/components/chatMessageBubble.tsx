"use client";

import { Avatar, AvatarImage } from "@/components/atom/avatar";
import { cn } from "@/lib/utils";
import type { CoachMessage } from "../types";
import { MilestoneUpdateProposalWidget } from "./milestoneUpdateProposalWidget";
import { ObjectiveProposalWidget } from "./objectiveProposalWidget";
import { PlanProposalWidget } from "./planProposalWidget";

type ChatMessageBubbleProps = {
	message: CoachMessage;
	onAdoptKeyResult: (messageId: number, keyResultIndex: number) => Promise<void>;
	onAdoptTodo: (messageId: number, todoIndex: number) => Promise<void>;
	onAdoptObjective: (messageId: number) => Promise<void>;
	onAdoptMilestoneUpdate: (messageId: number, milestoneUpdateIndex: number) => Promise<void>;
	adoptingKey: string | undefined;
	isAdoptingObjective: boolean;
	isGoalLimitReached: boolean;
};

export function ChatMessageBubble({
	message,
	onAdoptKeyResult,
	onAdoptTodo,
	onAdoptObjective,
	onAdoptMilestoneUpdate,
	adoptingKey,
	isAdoptingObjective,
	isGoalLimitReached,
}: ChatMessageBubbleProps) {
	const isUser = message.role === "user";

	return (
		<div className={cn("flex items-start gap-2", isUser ? "justify-end" : "justify-start")}>
			{!isUser && (
				<Avatar size="lg" className="shrink-0">
					<AvatarImage src="/penguin-talk.png" alt="AIコーチ" />
				</Avatar>
			)}
			<div className={cn("max-w-[80%] space-y-1", isUser && "flex flex-col items-end")}>
				<div
					className={cn(
						"rounded-xl px-4 py-2 text-sm leading-relaxed",
						isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
					)}
				>
					{message.content}
				</div>
				{message.proposal?.objective && (
					<ObjectiveProposalWidget
						objective={message.proposal.objective}
						keyResults={message.proposal.keyResults}
						onAdopt={() => onAdoptObjective(message.id)}
						isAdopting={isAdoptingObjective}
						isGoalLimitReached={isGoalLimitReached}
					/>
				)}
				{message.proposal && !message.proposal.objective && (
					<>
						<PlanProposalWidget
							proposal={message.proposal}
							messageId={message.id}
							adoptingKey={adoptingKey}
							onAdoptKeyResult={(keyResultIndex) => onAdoptKeyResult(message.id, keyResultIndex)}
							onAdoptTodo={(todoIndex) => onAdoptTodo(message.id, todoIndex)}
						/>
						<MilestoneUpdateProposalWidget
							milestoneUpdates={message.proposal.milestoneUpdates}
							messageId={message.id}
							adoptingKey={adoptingKey}
							onAdopt={(milestoneUpdateIndex) =>
								onAdoptMilestoneUpdate(message.id, milestoneUpdateIndex)
							}
						/>
					</>
				)}
			</div>
		</div>
	);
}
