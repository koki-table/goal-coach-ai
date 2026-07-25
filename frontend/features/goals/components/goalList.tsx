"use client";

import { Button } from "@/components/atom/button";
import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { MAX_ACTIVE_GOALS, RECOMMENDED_GOALS } from "../config/goalsConfig";
import { canCreateGoal } from "../helpers/goalLimit.helper";
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
	// 各目標の達成確率と進捗率（goalId -> 値 のマッピング）
	probabilityMap?: Record<string, number>;
	progressMap?: Record<string, number>;
};

export function GoalList({
	goals,
	selectedGoalId,
	onSelectGoal,
	onCreateGoal,
	isLoading = false,
	probabilityMap = {},
	progressMap = {},
}: GoalListProps) {
	const [showCreateForm, setShowCreateForm] = useState(false);

	// 未完了(active)目標が上限に達している場合は新規作成できない（propsからの純粋な導出）
	const canCreate = canCreateGoal(goals);

	const handleCreate = async (data: GoalInput) => {
		await onCreateGoal(data);
		setShowCreateForm(false);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">目標一覧</h2>
				<Button
					size="sm"
					onClick={() => setShowCreateForm(true)}
					disabled={showCreateForm || !canCreate}
				>
					<Plus weight="bold" className="mr-1" />
					新規作成
				</Button>
			</div>

			{/* OKRの方針: 意識を分散させないため未完了の目標は最大数まで・推奨1件 */}
			{!canCreate && !showCreateForm && (
				<div className="rounded-lg border border-dashed border-warning/50 bg-warning/5 p-4 text-sm text-muted-foreground">
					進行中の目標が{MAX_ACTIVE_GOALS}
					件に達している。新しい目標を設定するには、まず今の目標をやり切ろう。OKRでは意識を分散させず、まず
					{RECOMMENDED_GOALS}件に集中するのがおすすめだ。
				</div>
			)}

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
							achievementProbability={probabilityMap[goal.id]}
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
