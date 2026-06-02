"use client";

import { useCallback } from "react";
import { useTodos } from "@/features/todos/hooks/useTodos";
import { useAllMilestones } from "@/features/todos/hooks/useMilestones";
import { TodoGroupByGoal } from "@/features/todos/components/todoGroupByGoal";
import type { TodoInput, MilestoneEntry } from "@/features/todos/schemas/todoSchema";
import type { Milestone } from "@/features/todos/types";
import { Skeleton } from "@/components/atom/skeleton";

// モック: マイルストーンストア（useMilestonesと共有するため外部化が必要だが、ここでは簡易実装）
const mockMilestonesStore: Record<string, Milestone[]> = {
	"goal-1": [
		{
			id: "milestone-1-1",
			goalId: "goal-1",
			title: "毎日30分の英語学習を習慣化",
			label: "短期目標",
			order: 1,
			isCompleted: true,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
		{
			id: "milestone-1-2",
			goalId: "goal-1",
			title: "TOEIC模試で600点達成",
			label: "中期目標",
			order: 2,
			isCompleted: false,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
		{
			id: "milestone-1-3",
			goalId: "goal-1",
			title: "TOEIC本番で900点達成",
			label: "長期目標",
			order: 3,
			isCompleted: false,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
	],
	"goal-2": [
		{
			id: "milestone-2-1",
			goalId: "goal-2",
			title: "週3回のジョギング習慣化",
			label: "短期目標",
			order: 1,
			isCompleted: true,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
		{
			id: "milestone-2-2",
			goalId: "goal-2",
			title: "ハーフマラソン完走",
			label: "中期目標",
			order: 2,
			isCompleted: false,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
		{
			id: "milestone-2-3",
			goalId: "goal-2",
			title: "フルマラソン完走",
			label: "長期目標",
			order: 3,
			isCompleted: false,
			createdAt: "2026-05-01T00:00:00.000Z",
		},
	],
};

export default function TodosPage() {
	const {
		goalsWithTodos,
		isLoading: todosLoading,
		toggleTodoComplete,
		deleteTodo,
		addTodo,
		reorderTodos,
	} = useTodos();

	const { milestonesMap, isLoading: milestonesLoading } = useAllMilestones();

	// 目標ごとのTODOグループを構築（マイルストーンを含む）
	const groups = goalsWithTodos.map((g) => ({
		goalId: g.goalId,
		goalTitle: g.goalTitle,
		milestones: milestonesMap[g.goalId] || mockMilestonesStore[g.goalId] || [],
		myTodos: g.myTodos,
	}));

	// ハンドラー
	const handleToggleComplete = useCallback(
		(todoId: string) => {
			toggleTodoComplete(todoId);
		},
		[toggleTodoComplete],
	);

	const handleDeleteTodo = useCallback(
		(todoId: string) => {
			deleteTodo(todoId);
		},
		[deleteTodo],
	);

	const handleAddTodo = useCallback(
		(goalId: string, input: TodoInput) => {
			addTodo(goalId, input, false);
		},
		[addTodo],
	);

	const handleReorderTodos = useCallback(
		(
			sourceList: "aiTodos" | "myTodos",
			sourceIndex: number,
			destinationList: "aiTodos" | "myTodos",
			destinationIndex: number,
			goalId: string,
		) => {
			reorderTodos(sourceList, sourceIndex, destinationList, destinationIndex, goalId);
		},
		[reorderTodos],
	);

	const handleToggleMilestoneComplete = useCallback(
		(_goalId: string, milestoneId: string) => {
			// TODO: マイルストーン完了トグルの実装
			console.log("Toggle milestone:", milestoneId);
		},
		[],
	);

	const handleSaveMilestones = useCallback(
		async (goalId: string, data: MilestoneEntry[]) => {
			// TODO: マイルストーン保存の実装
			console.log("Save milestones for goal:", goalId, data);
			// 実際のAPIコールやストア更新をここで行う
		},
		[],
	);

	const isLoading = todosLoading || milestonesLoading;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">TODO</h2>
					<p className="text-muted-foreground">
						目標ごとのタスクを管理します
					</p>
				</div>
				<div className="space-y-4">
					<Skeleton className="h-64 w-full" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">TODO</h2>
				<p className="text-muted-foreground">
					目標ごとのタスクを管理します。TODOを完了すると達成回数がカウントされます。
				</p>
			</div>

			<TodoGroupByGoal
				groups={groups}
				onToggleComplete={handleToggleComplete}
				onDeleteTodo={handleDeleteTodo}
				onAddTodo={handleAddTodo}
				onReorderTodos={handleReorderTodos}
				onToggleMilestoneComplete={handleToggleMilestoneComplete}
				onSaveMilestones={handleSaveMilestones}
			/>
		</div>
	);
}
