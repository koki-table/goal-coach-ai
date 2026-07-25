"use client";

import { Badge } from "@/components/atom/badge";
import { Button } from "@/components/atom/button";
import { cn } from "@/lib/utils";
import { CheckCircle } from "@phosphor-icons/react";
import type { PlanProposal } from "../types";

type PlanProposalWidgetProps = {
	proposal: PlanProposal;
	onAdoptMilestone: () => Promise<void>;
	onAdoptTodo: (todoIndex: number) => Promise<void>;
	adoptingKey: string | undefined;
	messageId: number;
};

export function PlanProposalWidget({
	proposal,
	onAdoptMilestone,
	onAdoptTodo,
	adoptingKey,
	messageId,
}: PlanProposalWidgetProps) {
	const milestoneKey = `${messageId}:milestone`;
	const milestoneBlocksTodos = proposal.milestone !== null && !proposal.milestone.adopted;

	return (
		<div className="mt-2 space-y-3 rounded-lg border bg-muted/30 p-3">
			{proposal.milestone && (
				<div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
					<div className="space-y-1">
						<Badge variant="secondary">主要な成果（Key Results）</Badge>
						<p className="text-sm font-medium">{proposal.milestone.title}</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={proposal.milestone.adopted || adoptingKey === milestoneKey}
						onClick={onAdoptMilestone}
					>
						{proposal.milestone.adopted ? (
							<>
								<CheckCircle weight="fill" className="mr-1 size-4" />
								採用済み
							</>
						) : adoptingKey === milestoneKey ? (
							"採用中..."
						) : (
							"採用する"
						)}
					</Button>
				</div>
			)}

			{proposal.todos.length > 0 && (
				<ul className="space-y-2">
					{proposal.todos.map((todo, index) => {
						const todoKey = `${messageId}:todo:${index}`;
						const disabledByMilestone = milestoneBlocksTodos;
						return (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: 提案配列はメッセージ内で固定され、順序も意味を持つ
								key={index}
								className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
							>
								<div className="space-y-1">
									<Badge variant={todo.taskType === "daily" ? "default" : "outline"}>
										{todo.taskType === "daily" ? "毎日" : "1回"}
									</Badge>
									<p className={cn("text-sm", disabledByMilestone && "text-muted-foreground")}>
										{todo.title}
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={todo.adopted || disabledByMilestone || adoptingKey === todoKey}
									onClick={() => onAdoptTodo(index)}
								>
									{todo.adopted ? (
										<>
											<CheckCircle weight="fill" className="mr-1 size-4" />
											採用済み
										</>
									) : adoptingKey === todoKey ? (
										"採用中..."
									) : disabledByMilestone ? (
										"主要な成果の採用後"
									) : (
										"採用する"
									)}
								</Button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
