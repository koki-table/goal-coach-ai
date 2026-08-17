"use client";

import { Badge } from "@/components/atom/badge";
import { Button } from "@/components/atom/button";
import { CheckCircle } from "@phosphor-icons/react";
import {
	getTodoUpdateActionLabel,
	getTodoUpdateChangeLines,
	isTodoUpdateDestructive,
} from "../helpers/todoUpdateDisplay.helper";
import type { ProposalTodoUpdate } from "../types";

type TodoUpdateProposalWidgetProps = {
	todoUpdates: ProposalTodoUpdate[];
	onAdopt: (todoUpdateIndex: number) => Promise<void>;
	adoptingKey: string | undefined;
	messageId: number;
};

export function TodoUpdateProposalWidget({
	todoUpdates,
	onAdopt,
	adoptingKey,
	messageId,
}: TodoUpdateProposalWidgetProps) {
	if (todoUpdates.length === 0) {
		return null;
	}

	return (
		<div className="mt-2 space-y-2 rounded-lg border bg-muted/30 p-3">
			<ul className="space-y-2">
				{todoUpdates.map((update, index) => {
					const updateKey = `${messageId}:tu:${index}`;
					const destructive = isTodoUpdateDestructive(update);
					const changeLines = getTodoUpdateChangeLines(update);
					return (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: 提案配列はメッセージ内で固定され、順序も意味を持つ
							key={index}
							className="space-y-2 rounded-lg border bg-background p-3"
						>
							<Badge variant={destructive ? "destructive" : "secondary"}>TODOの更新提案</Badge>
							<p className="text-sm font-medium">{update.todoTitle}</p>
							<p className="text-xs text-muted-foreground">{update.reason}</p>
							{changeLines.length > 0 && (
								<ul className="space-y-0.5">
									{changeLines.map((line) => (
										<li key={line} className="text-xs tabular-nums text-muted-foreground">
											{line}
										</li>
									))}
								</ul>
							)}
							<div className="flex items-center justify-end gap-3">
								<Button
									type="button"
									variant={destructive ? "destructive" : "outline"}
									size="sm"
									disabled={update.adopted || adoptingKey === updateKey}
									onClick={() => onAdopt(index)}
								>
									{update.adopted ? (
										<>
											<CheckCircle weight="fill" className="mr-1 size-4" />
											反映済み
										</>
									) : adoptingKey === updateKey ? (
										"反映中..."
									) : (
										getTodoUpdateActionLabel(update)
									)}
								</Button>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
