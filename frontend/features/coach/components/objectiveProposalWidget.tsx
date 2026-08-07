"use client";

import { Badge } from "@/components/atom/badge";
import { Button } from "@/components/atom/button";
import type { ProposalKeyResult, ProposalObjective } from "../types";

const CATEGORY_LABELS: Record<string, string> = {
	study: "学習",
	career: "キャリア",
	health: "健康",
	skill: "スキル",
	finance: "財務",
	other: "その他",
};

type ObjectiveProposalWidgetProps = {
	objective: ProposalObjective;
	keyResults: ProposalKeyResult[];
	onAdopt: () => Promise<void>;
	isAdopting: boolean;
	isGoalLimitReached: boolean;
};

export function ObjectiveProposalWidget({
	objective,
	keyResults,
	onAdopt,
	isAdopting,
	isGoalLimitReached,
}: ObjectiveProposalWidgetProps) {
	if (!objective) return null;

	const isAdopted = keyResults.length > 0 && keyResults.every((kr) => kr.adopted);

	return (
		<div className="mt-2 space-y-3 rounded-lg border bg-muted/30 p-3">
			<div className="space-y-2 rounded-lg border bg-background p-3">
				<Badge variant="secondary">目標（Objective）</Badge>
				<p className="text-sm font-medium">{objective.title}</p>
				<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
					<span>期限: {objective.deadline ?? "未設定"}</span>
					<span>カテゴリ: {CATEGORY_LABELS[objective.category] ?? objective.category}</span>
				</div>

				{keyResults.length > 0 && (
					<ul className="space-y-1 pt-1">
						{keyResults.map((keyResult, index) => (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: 提案配列はメッセージ内で固定され、順序も意味を持つ
								key={index}
								className="text-xs text-muted-foreground"
							>
								・{keyResult.title}（目標: {keyResult.targetValue}
								{keyResult.unit}）
							</li>
						))}
					</ul>
				)}

				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-2 w-full"
					disabled={isAdopted || isAdopting || isGoalLimitReached}
					onClick={onAdopt}
				>
					{isAdopted ? "採用済み" : isAdopting ? "採用中..." : "この目標にする"}
				</Button>
				{isGoalLimitReached && !isAdopted && (
					<p className="text-xs text-destructive">
						目標は同時に2件までしか設定できません。既存の目標を完了してから採用してください。
					</p>
				)}
			</div>
		</div>
	);
}
