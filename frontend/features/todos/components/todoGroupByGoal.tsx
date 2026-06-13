"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import { Target } from "@phosphor-icons/react";
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
	onSaveMilestones: (goalId: string, data: MilestoneEntry[]) => Promise<void>;
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
		<div className="space-y-6">
			{groups.map((group) => (
				<Card key={group.goalId} className="overflow-hidden">
					<CardHeader className="bg-muted/30 pb-4">
						<CardTitle className="flex items-center gap-2">
							<Target weight="fill" className="size-5 text-primary" />
							{group.goalTitle}
						</CardTitle>

						{/* マイルストーン表示/編集 */}
						{editingGoalId === group.goalId ? (
							<MilestoneForm
								milestones={group.milestones}
								onSave={async (data) => {
									await onSaveMilestones(group.goalId, data);
									setEditingGoalId(null);
								}}
								onCancel={() => setEditingGoalId(null)}
								className="mt-3"
							/>
						) : (
							<MilestoneProgress
								milestones={group.milestones}
								onEdit={() => setEditingGoalId(group.goalId)}
								onToggleComplete={(milestoneId) =>
									onToggleMilestoneComplete(group.goalId, milestoneId)
								}
								className="mt-3"
							/>
						)}
					</CardHeader>

					<CardContent className="pt-4">
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
					</CardContent>
				</Card>
			))}
		</div>
	);
}
