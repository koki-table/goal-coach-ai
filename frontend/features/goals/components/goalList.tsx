"use client";

import { Button } from "@/components/atom/button";
import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import type { GoalInput } from "../schemas/goalSchema";
import type { Goal } from "../types";
import { GoalCard } from "./goalCard";
import { GoalForm } from "./goalForm";

type GoalListProps = {
	goals: Goal[];
	selectedGoalId?: string;
	onSelectGoal: (goalId: string) => void;
	onCreateGoal: (data: GoalInput) => Promise<void>;
	isLoading?: boolean;
	// 各目標の進捗率（goalId -> 値 のマッピング）
	progressMap?: Record<string, number>;
};

export function GoalList({
	goals,
	selectedGoalId,
	onSelectGoal,
	onCreateGoal,
	isLoading = false,
	progressMap = {},
}: GoalListProps) {
	const [showCreateForm, setShowCreateForm] = useState(false);

	const handleCreate = async (data: GoalInput) => {
		await onCreateGoal(data);
		setShowCreateForm(false);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">目標一覧</h2>
				<Button size="sm" onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
					<Plus weight="bold" className="mr-1" />
					新規作成
				</Button>
			</div>

			{showCreateForm && (
				<GoalForm
					onSubmit={handleCreate}
					onCancel={() => setShowCreateForm(false)}
					isLoading={isLoading}
				/>
			)}

			{goals.length === 0 && !showCreateForm ? (
				<div className="rounded-lg border border-dashed p-8 text-center">
					<p className="text-muted-foreground">
						まだ目標が設定されていません。
						<br />
						「新規作成」ボタンから目標を追加しましょう。
					</p>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{goals.map((goal) => (
						<GoalCard
							key={goal.id}
							goal={goal}
							progressPercent={progressMap[goal.id]}
							onClick={() => onSelectGoal(goal.id)}
							isSelected={selectedGoalId === goal.id}
						/>
					))}
				</div>
			)}
		</div>
	);
}
