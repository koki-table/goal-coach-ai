"use client";

import { Skeleton } from "@/components/atom/skeleton";
import { PlanCard } from "@/features/billing/components/planCard";
import {
	FREE_DAILY_DECIDED_LIMIT,
	MONTHLY_PRICE_JPY,
	YEARLY_PRICE_JPY,
} from "@/features/billing/config/billingConfig";
import { BillingProvider, useBillingContext } from "@/features/billing/contexts/billingContext";
import { formatFreeTierUsageLabel } from "@/features/billing/helpers/usageDisplay.helper";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function BillingPageContent() {
	const searchParams = useSearchParams();
	const checkoutResult = searchParams.get("checkout");

	const {
		tier,
		status,
		isLoading,
		decidedMessagesUsedToday,
		startCheckout,
		isCheckoutLoading,
		openPortal,
		isPortalLoading,
	} = useBillingContext();

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-40" />
			</div>
		);
	}

	const usageLabel =
		tier === "free"
			? formatFreeTierUsageLabel(decidedMessagesUsedToday, FREE_DAILY_DECIDED_LIMIT)
			: undefined;

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h2 className="text-2xl font-bold tracking-tight">プラン設定</h2>
				<p className="text-muted-foreground">現在のプランの確認、変更、お支払い管理ができます。</p>
			</div>

			{checkoutResult === "success" && (
				<p className="rounded-lg bg-success/10 px-4 py-2 text-sm text-success">
					お支払いが完了しました。Proプランをご利用いただけます。
				</p>
			)}
			{checkoutResult === "cancel" && (
				<p className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
					お支払い手続きがキャンセルされました。
				</p>
			)}

			<PlanCard
				tier={tier}
				status={status}
				usageLabel={usageLabel}
				isCheckoutLoading={isCheckoutLoading}
				isPortalLoading={isPortalLoading}
				onUpgrade={startCheckout}
				onManage={openPortal}
			/>

			<div className="rounded-xl border p-4 text-sm text-muted-foreground">
				<p>月額プラン: ¥{MONTHLY_PRICE_JPY}/月</p>
				<p>年額プラン: ¥{YEARLY_PRICE_JPY}/年（月額換算で割安）</p>
			</div>
		</div>
	);
}

export default function BillingPage() {
	return (
		<Suspense fallback={<Skeleton className="h-96 w-full" />}>
			<BillingProvider>
				<BillingPageContent />
			</BillingProvider>
		</Suspense>
	);
}
