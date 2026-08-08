"use client";

import { Badge } from "@/components/atom/badge";
import { Button } from "@/components/atom/button";
import { cn } from "@/lib/utils";
import { CheckCircle } from "@phosphor-icons/react";
import type { PlanProposal } from "../types";

type PlanProposalWidgetProps = {
	proposal: PlanProposal;
	onAdoptKeyResult: (keyResultIndex: number) => Promise<void>;
	onAdoptTodo: (todoIndex: number) => Promise<void>;
	adoptingKey: string | undefined;
	messageId: number;
};

export function PlanProposalWidget({
	proposal,
	onAdoptKeyResult,
	onAdoptTodo,
	adoptingKey,
	messageId,
}: PlanProposalWidgetProps) {
	// KRが1件以上ある場合、全て採用済みになるまでTODOの採用をブロックする
	const keyResultsBlockTodos =
		proposal.keyResults.length > 0 && !proposal.keyResults.every((kr) => kr.adopted);

	// 新規提案が無い(keyResults/todosともに空)場合は、空の枠だけのカードを表示しない
	if (proposal.keyResults.length === 0 && proposal.todos.length === 0) {
		return null;
	}

	return (
		<div className="mt-2 space-y-3 rounded-lg border bg-muted/30 p-3">
			{proposal.keyResults.length > 0 && (
				<ul className="space-y-2">
					{proposal.keyResults.map((keyResult, index) => {
						const keyResultKey = `${messageId}:kr:${index}`;
						return (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: 提案配列はメッセージ内で固定され、順序も意味を持つ
								key={index}
								className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
							>
								<div className="space-y-1">
									<Badge variant="secondary">主要な成果（Key Results）</Badge>
									<p className="text-sm font-medium">{keyResult.title}</p>
									<p className="text-xs tabular-nums text-muted-foreground">
										目標: {keyResult.targetValue}
										{keyResult.unit && <span className="ml-0.5">{keyResult.unit}</span>}
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={keyResult.adopted || adoptingKey === keyResultKey}
									onClick={() => onAdoptKeyResult(index)}
								>
									{keyResult.adopted ? (
										<>
											<CheckCircle weight="fill" className="mr-1 size-4" />
											採用済み
										</>
									) : adoptingKey === keyResultKey ? (
										"採用中..."
									) : (
										"採用する"
									)}
								</Button>
							</li>
						);
					})}
				</ul>
			)}

			{proposal.todos.length > 0 && (
				<ul className="space-y-2">
					{proposal.todos.map((todo, index) => {
						const todoKey = `${messageId}:todo:${index}`;
						const disabledByKeyResults = keyResultsBlockTodos;
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
									<p className={cn("text-sm", disabledByKeyResults && "text-muted-foreground")}>
										{todo.title}
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={todo.adopted || disabledByKeyResults || adoptingKey === todoKey}
									onClick={() => onAdoptTodo(index)}
								>
									{todo.adopted ? (
										<>
											<CheckCircle weight="fill" className="mr-1 size-4" />
											採用済み
										</>
									) : adoptingKey === todoKey ? (
										"採用中..."
									) : disabledByKeyResults ? (
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
