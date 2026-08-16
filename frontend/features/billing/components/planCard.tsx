"use client";

import { Button } from "@/components/atom/button";
import { MONTHLY_PRICE_JPY, PLAN_FEATURES, YEARLY_PRICE_JPY } from "../config/billingConfig";
import { formatCancelNotice } from "../helpers/cancelNotice.helper";
import type { BillingInterval, SubscriptionStatus, SubscriptionTier } from "../types";
import { PlanFeatureCard } from "./planFeatureCard";

const INTERVAL_LABELS: Record<BillingInterval, string> = {
	monthly: "月額プラン",
	yearly: "年額プラン",
};

type PlanCardProps = {
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	// tier="pro"の時のみ値が入る。free tierや未知のpriceIdではundefined
	interval?: BillingInterval;
	// freeプランの時のみ渡す。proでは"無制限"訴求を守るため常に非表示にする
	usageLabel?: string;
	// trueの間はstatus="active"のままcurrentPeriodEndまでpro機能を使い続けられる
	cancelAtPeriodEnd: boolean;
	currentPeriodEnd?: string;
	isCheckoutLoading: boolean;
	isPortalLoading: boolean;
	onUpgrade: (interval: BillingInterval) => void;
	onManage: () => void;
};

function UpgradeButtons({
	isCheckoutLoading,
	onUpgrade,
}: {
	isCheckoutLoading: boolean;
	onUpgrade: (interval: BillingInterval) => void;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			<Button disabled={isCheckoutLoading} onClick={() => onUpgrade("monthly")}>
				月額¥{MONTHLY_PRICE_JPY}でアップグレード
			</Button>
			<Button variant="outline" disabled={isCheckoutLoading} onClick={() => onUpgrade("yearly")}>
				年額¥{YEARLY_PRICE_JPY}でアップグレード
			</Button>
		</div>
	);
}

export function PlanCard({
	tier,
	status,
	interval,
	usageLabel,
	cancelAtPeriodEnd,
	currentPeriodEnd,
	isCheckoutLoading,
	isPortalLoading,
	onUpgrade,
	onManage,
}: PlanCardProps) {
	const proPriceLabel =
		tier === "pro" && interval === "yearly" ? `¥${YEARLY_PRICE_JPY}` : `¥${MONTHLY_PRICE_JPY}`;
	const proPriceUnit = tier === "pro" ? undefined : "/月";

	return (
		<div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
			<PlanFeatureCard
				planName="無料プラン"
				priceLabel="¥0"
				priceUnit="/月"
				features={PLAN_FEATURES.free}
				isCurrentPlan={tier === "free"}
			>
				{tier === "free" && (
					<>
						{usageLabel && <p className="text-sm text-muted-foreground">{usageLabel}</p>}
						<UpgradeButtons isCheckoutLoading={isCheckoutLoading} onUpgrade={onUpgrade} />
					</>
				)}
			</PlanFeatureCard>

			<PlanFeatureCard
				planName="Proプラン"
				priceLabel={proPriceLabel}
				priceUnit={proPriceUnit}
				features={PLAN_FEATURES.pro}
				isCurrentPlan={tier === "pro"}
			>
				{tier === "pro" && interval && (
					<p className="text-sm text-muted-foreground">{INTERVAL_LABELS[interval]}</p>
				)}
				{tier === "pro" && status === "past_due" && (
					<p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
						お支払いに問題が発生しています。お支払い方法を更新してください。
					</p>
				)}
				{tier === "pro" && cancelAtPeriodEnd && (
					<p className="rounded-lg bg-warning/10 px-4 py-2 text-sm text-warning-foreground">
						{formatCancelNotice(currentPeriodEnd)}
					</p>
				)}
				{tier === "pro" ? (
					<Button variant="outline" disabled={isPortalLoading} onClick={onManage}>
						お支払い方法・請求書を管理
					</Button>
				) : (
					<UpgradeButtons isCheckoutLoading={isCheckoutLoading} onUpgrade={onUpgrade} />
				)}
			</PlanFeatureCard>
		</div>
	);
}
