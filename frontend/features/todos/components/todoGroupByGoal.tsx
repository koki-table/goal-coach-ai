"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { CaretDown, Flag, PencilSimple, Target } from "@phosphor-icons/react";
import { useState } from "react";
import type { MilestoneEntry } from "../schemas/todoSchema";
import type { Milestone, Todo } from "../types";
import { MilestoneForm } from "./milestoneForm";
import { MilestoneProgress } from "./milestoneProgress";
import { TodoBoard } from "./todoBoard";

type GoalTodoGroup = {
	goalId: string;
	goalTitle: string;
	milestones: Milestone[];
	myTodos: Todo[];
};

type TodoGroupByGoalProps = {
	groups: GoalTodoGroup[];
	onToggleComplete: (todoId: string) => void;
	onDeleteTodo: (todoId: string) => void;
	onAddTodo: (goalId: string) => void;
	onEditTodo: (todo: Todo) => void;
	onReorderTodos: (
		sourceList: "aiTodos" | "myTodos",
		sourceIndex: number,
		destinationList: "aiTodos" | "myTodos",
		destinationIndex: number,
		goalId: string,
	) => void;
	onToggleMilestoneComplete: (goalId: string, milestoneId: string) => void;
	onSaveMilestones: (goalId: string, data: MilestoneEntry[]) => Promise<boolean>;
};

export function TodoGroupByGoal({
	groups,
	onToggleComplete,
	onDeleteTodo,
	onAddTodo,
	onEditTodo,
	onReorderTodos,
	onToggleMilestoneComplete,
	onSaveMilestones,
}: TodoGroupByGoalProps) {
	const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

	// スマホ（md未満）では目標タイトルのタップで配下を折りたたみできる
	const isMobile = useMediaQuery("(max-width: 767px)");
	const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

	const toggleCollapsed = (goalId: string) => {
		setCollapsedIds((prev) => {
			const next = new Set(prev);
			if (next.has(goalId)) {
				next.delete(goalId);
			} else {
				next.add(goalId);
			}
			return next;
		});
	};

	if (groups.length === 0) {
		return (
			<div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
				<div className="text-center">
					<Target weight="bold" className="mx-auto mb-2 size-12 text-muted-foreground" />
					<p className="text-muted-foreground">目標がありません。まず目標を設定してください。</p>
				</div>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 xl:grid-cols-3">
			{groups.map((group) => {
				const isExpanded = !isMobile || !collapsedIds.has(group.goalId);
				return (
					<Card key={group.goalId} className="overflow-hidden">
						<CardHeader className={cn("bg-muted/30", isExpanded && "pb-4")}>
							{isMobile ? (
								<button
									type="button"
									onClick={() => toggleCollapsed(group.goalId)}
									aria-expanded={isExpanded}
									className="flex w-full items-center justify-between gap-2 text-left"
								>
									<CardTitle className="flex items-center gap-2">
										<Target weight="fill" className="size-5 text-primary" />
										{group.goalTitle}
									</CardTitle>
									<CaretDown
										weight="bold"
										className={cn(
											"size-5 shrink-0 text-muted-foreground transition-transform",
											isExpanded ? "" : "-rotate-90",
										)}
									/>
								</button>
							) : (
								<CardTitle className="flex items-center gap-2">
									<Target weight="fill" className="size-5 text-primary" />
									{group.goalTitle}
								</CardTitle>
							)}
						</CardHeader>

						{isExpanded && (
							<CardContent className="pt-4">
								{/* マイルストーンセクション（枠なし） */}
								<div>
									<div className="mb-3 flex items-center justify-between">
										<CardTitle className="flex items-center gap-2 text-sm">
											<Flag weight="fill" className="size-4 text-primary" />
											マイルストーン
										</CardTitle>
										{editingGoalId !== group.goalId && (
											<button
												type="button"
												onClick={() => setEditingGoalId(group.goalId)}
												className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
											>
												<PencilSimple weight="bold" className="size-3.5" />
												編集
											</button>
										)}
									</div>
									{editingGoalId === group.goalId ? (
										<MilestoneForm
											milestones={group.milestones}
											onSave={async (data) => {
												const saved = await onSaveMilestones(group.goalId, data);
												if (saved) {
													setEditingGoalId(null);
												}
											}}
											onCancel={() => setEditingGoalId(null)}
										/>
									) : (
										<MilestoneProgress
											milestones={group.milestones}
											onToggleComplete={(milestoneId) =>
												onToggleMilestoneComplete(group.goalId, milestoneId)
											}
										/>
									)}
								</div>

								{/* TODOセクション（区切り線で分ける） */}
								<div className="mt-8 border-border border-t pt-8">
									<TodoBoard
										goalId={group.goalId}
										myTodos={group.myTodos}
										milestones={group.milestones}
										onToggleComplete={onToggleComplete}
										onDeleteTodo={onDeleteTodo}
										onAddTodo={onAddTodo}
										onEditTodo={onEditTodo}
										onReorder={onReorderTodos}
									/>
								</div>
							</CardContent>
						)}
					</Card>
				);
			})}
		</div>
	);
}
