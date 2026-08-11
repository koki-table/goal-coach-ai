"use client";

import { Button } from "@/components/atom/button";
import { MONTHLY_PRICE_JPY, YEARLY_PRICE_JPY } from "@/features/billing/config/billingConfig";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { calculateYearlyDiscount } from "../helpers/yearlyDiscount.helper";
import type { CtaTarget } from "../types";
import { PricingCard } from "./pricingCard";

type PricingProps = {
	primaryCta: CtaTarget;
};

export function Pricing({ primaryCta }: PricingProps) {
	const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
	const { discountPercent } = calculateYearlyDiscount(MONTHLY_PRICE_JPY, YEARLY_PRICE_JPY);

	const proPrice = interval === "monthly" ? `¥${MONTHLY_PRICE_JPY}` : `¥${YEARLY_PRICE_JPY}`;
	const proPriceUnit = interval === "monthly" ? "/月" : `/年（${discountPercent}%お得）`;

	return (
		<section id="pricing" className="bg-muted/50 py-16 md:py-24">
			<div className="mx-auto max-w-6xl px-4 md:px-6">
				<div className="mx-auto max-w-2xl text-center">
					<p className="text-sm font-semibold text-primary">PRICING</p>
					<h2 className="mt-2 text-2xl font-bold md:text-3xl">シンプルで透明性のある料金プラン</h2>
				</div>

				<div className="mt-8 flex justify-center gap-2">
					<Button
						variant={interval === "monthly" ? "default" : "outline"}
						size="sm"
						onClick={() => setInterval("monthly")}
					>
						月払い
					</Button>
					<Button
						variant={interval === "yearly" ? "default" : "outline"}
						size="sm"
						onClick={() => setInterval("yearly")}
					>
						年払い
					</Button>
				</div>

				<div className={cn("mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2")}>
					<PricingCard
						planName="Free"
						priceLabel="¥0"
						priceUnit="/月"
						features={[{ label: "目標・TODO管理" }, { label: "ペンタ君との対話 1日3回まで" }]}
						ctaLabel={primaryCta.label}
						ctaHref={primaryCta.href}
					/>
					<PricingCard
						planName="Pro"
						priceLabel={proPrice}
						priceUnit={proPriceUnit}
						features={[
							{ label: "対話・提案 無制限" },
							{ label: "自律エージェント", comingSoon: true },
							{ label: "日次レポート", comingSoon: true },
						]}
						ctaLabel={primaryCta.label}
						ctaHref={primaryCta.href}
						highlighted
					/>
				</div>
			</div>
		</section>
	);
}
