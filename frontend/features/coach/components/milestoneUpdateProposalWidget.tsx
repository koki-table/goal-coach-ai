"use client";

import { Badge } from "@/components/atom/badge";
import { Button } from "@/components/atom/button";
import { CheckCircle } from "@phosphor-icons/react";
import type { ProposalMilestoneUpdate } from "../types";

type MilestoneUpdateProposalWidgetProps = {
	milestoneUpdates: ProposalMilestoneUpdate[];
	onAdopt: (milestoneUpdateIndex: number) => Promise<void>;
	adoptingKey: string | undefined;
	messageId: number;
};

export function MilestoneUpdateProposalWidget({
	milestoneUpdates,
	onAdopt,
	adoptingKey,
	messageId,
}: MilestoneUpdateProposalWidgetProps) {
	if (milestoneUpdates.length === 0) {
		return null;
	}

	return (
		<div className="mt-2 space-y-2 rounded-lg border bg-muted/30 p-3">
			<ul className="space-y-2">
				{milestoneUpdates.map((update, index) => {
					const updateKey = `${messageId}:mu:${index}`;
					return (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: 提案配列はメッセージ内で固定され、順序も意味を持つ
							key={index}
							className="space-y-2 rounded-lg border bg-background p-3"
						>
							<Badge variant="secondary">主要な成果の進捗推定</Badge>
							<p className="text-sm font-medium">{update.milestoneTitle}</p>
							<p className="text-xs text-muted-foreground">{update.reason}</p>
							<div className="flex items-center justify-between gap-3">
								<span className="text-xs tabular-nums text-muted-foreground">
									推定の現在値: {update.suggestedCurrentValue}
								</span>
								<Button
									type="button"
									variant="outline"
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
										"この値を反映する"
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
