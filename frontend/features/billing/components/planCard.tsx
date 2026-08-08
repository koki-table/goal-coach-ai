"use client";

import { Badge } from "@/components/atom/badge";
import { Button } from "@/components/atom/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import { MONTHLY_PRICE_JPY, YEARLY_PRICE_JPY } from "../config/billingConfig";
import type { BillingInterval, SubscriptionStatus, SubscriptionTier } from "../types";

type PlanCardProps = {
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	// freeプランの時のみ渡す。proでは"無制限"訴求を守るため常に非表示にする
	usageLabel?: string;
	isCheckoutLoading: boolean;
	isPortalLoading: boolean;
	onUpgrade: (interval: BillingInterval) => void;
	onManage: () => void;
};

export function PlanCard({
	tier,
	status,
	usageLabel,
	isCheckoutLoading,
	isPortalLoading,
	onUpgrade,
	onManage,
}: PlanCardProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardTitle>{tier === "pro" ? "Proプラン" : "無料プラン"}</CardTitle>
					<Badge variant={tier === "pro" ? "default" : "secondary"}>
						{tier === "pro" ? "Pro" : "Free"}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{tier === "pro" && status === "past_due" && (
					<p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
						お支払いに問題が発生しています。お支払い方法を更新してください。
					</p>
				)}

				{tier === "free" ? (
					<>
						{usageLabel && <p className="text-sm text-muted-foreground">{usageLabel}</p>}
						<div className="flex flex-wrap gap-2">
							<Button disabled={isCheckoutLoading} onClick={() => onUpgrade("monthly")}>
								月額¥{MONTHLY_PRICE_JPY}でアップグレード
							</Button>
							<Button
								variant="outline"
								disabled={isCheckoutLoading}
								onClick={() => onUpgrade("yearly")}
							>
								年額¥{YEARLY_PRICE_JPY}でアップグレード
							</Button>
						</div>
					</>
				) : (
					<>
						<p className="text-sm text-muted-foreground">
							AIコーチは実質無制限にご利用いただけます。
						</p>
						<Button variant="outline" disabled={isPortalLoading} onClick={onManage}>
							お支払い方法・請求書を管理
						</Button>
					</>
				)}
			</CardContent>
		</Card>
	);
}
