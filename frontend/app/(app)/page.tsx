"use client";

import { Badge } from "@/components/atom/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atom/card";
import { Progress } from "@/components/atom/progress";
import { Skeleton } from "@/components/atom/skeleton";
import { useGoals } from "@/features/goals/hooks/useGoals";
import { categoryLabels } from "@/features/goals/types";
import { useTodos } from "@/features/todos/hooks/useTodos";
import { useMemo } from "react";

export default function DashboardPage() {
	const { data: goals, isLoading: goalsLoading } = useGoals();
	const { todos, isLoading: todosLoading } = useTodos();

	const isLoading = goalsLoading || todosLoading;

	// 本日の TODO を算出
	const todayStats = useMemo(() => {
		const today = new Date().toISOString().split("T")[0];
		const todayTodos = todos.filter((t) => t.dueDate === today);
		const completed = todayTodos.filter((t) => t.completed).length;
		const total = todayTodos.length;
		return { completed, total, remaining: total - completed };
	}, [todos]);

	const goalCount = goals?.length ?? 0;
	const goalCategories = useMemo(() => {
		if (!goals) return [];
		const unique = [...new Set(goals.map((g) => g.category))];
		return unique.map((c) => categoryLabels[c] ?? c);
	}, [goals]);

	const todayProgress =
		todayStats.total > 0 ? Math.round((todayStats.completed / todayStats.total) * 100) : 0;

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">ダッシュボード</h2>
					<p className="text-muted-foreground">目標達成状況の概要を確認できます。</p>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">ダッシュボード</h2>
				<p className="text-muted-foreground">目標達成状況の概要を確認できます。</p>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				{/* 達成確率カード（AI機能準備中） */}
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>今月の達成確率</CardDescription>
						<CardTitle className="text-3xl font-bold text-primary">—</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-xs text-muted-foreground">AI分析機能は準備中です</p>
					</CardContent>
				</Card>

				{/* 進行中目標カード */}
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>進行中の目標</CardDescription>
						<CardTitle className="text-3xl font-bold">{goalCount}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							{goalCategories.map((label) => (
								<Badge key={label} variant="secondary">
									{label}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>

				{/* 本日のToDoカード */}
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>本日のToDo</CardDescription>
						<CardTitle className="text-3xl font-bold">
							{todayStats.completed} / {todayStats.total}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Progress value={todayProgress} className="h-2" />
						<p className="mt-2 text-xs text-muted-foreground">
							{todayStats.remaining > 0
								? `残り${todayStats.remaining}タスク`
								: todayStats.total > 0
									? "全て完了!"
									: "本日のタスクはありません"}
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
