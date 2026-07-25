"use client";

import { cn } from "@/lib/utils";
import type { CoachMessage } from "../types";
import { PlanProposalWidget } from "./planProposalWidget";

type ChatMessageBubbleProps = {
	message: CoachMessage;
	onAdoptMilestone: (messageId: number) => Promise<void>;
	onAdoptTodo: (messageId: number, todoIndex: number) => Promise<void>;
	adoptingKey: string | undefined;
};

export function ChatMessageBubble({
	message,
	onAdoptMilestone,
	onAdoptTodo,
	adoptingKey,
}: ChatMessageBubbleProps) {
	const isUser = message.role === "user";

	return (
		<div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
			<div className={cn("max-w-[80%] space-y-1", isUser && "flex flex-col items-end")}>
				<div
					className={cn(
						"rounded-xl px-4 py-2 text-sm leading-relaxed",
						isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
					)}
				>
					{message.content}
				</div>
				{message.proposal && (
					<PlanProposalWidget
						proposal={message.proposal}
						messageId={message.id}
						adoptingKey={adoptingKey}
						onAdoptMilestone={() => onAdoptMilestone(message.id)}
						onAdoptTodo={(todoIndex) => onAdoptTodo(message.id, todoIndex)}
					/>
				)}
			</div>
		</div>
	);
}
