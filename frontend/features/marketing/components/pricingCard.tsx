"use client";

import { Badge } from "@/components/atom/badge";
import { buttonVariants } from "@/components/atom/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import type { PlanFeature } from "@/features/billing/types";
import { cn } from "@/lib/utils";
import { Check } from "@phosphor-icons/react";
import Link from "next/link";

type PricingCardProps = {
	planName: string;
	priceLabel: string;
	priceUnit?: string;
	features: PlanFeature[];
	ctaLabel: string;
	ctaHref: string;
	highlighted?: boolean;
};

export function PricingCard({
	planName,
	priceLabel,
	priceUnit,
	features,
	ctaLabel,
	ctaHref,
	highlighted,
}: PricingCardProps) {
	return (
		<div className="relative">
			{highlighted && (
				<Badge className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">一番人気</Badge>
			)}
			<Card className={cn(highlighted && "border-primary shadow-md")}>
				<CardHeader>
					<CardTitle className="text-base">{planName}</CardTitle>
					<p className="mt-2">
						<span className="text-3xl font-bold">{priceLabel}</span>
						{priceUnit && <span className="text-sm text-muted-foreground">{priceUnit}</span>}
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<ul className="space-y-2">
						{features.map((feature) => (
							<li key={feature.label} className="flex items-start gap-2 text-sm">
								<Check className="mt-0.5 size-4 shrink-0 text-success" />
								<span>
									{feature.label}
									{feature.comingSoon && (
										<Badge variant="outline" className="ml-2">
											近日提供
										</Badge>
									)}
								</span>
							</li>
						))}
					</ul>
					<Link
						href={ctaHref}
						className={cn(
							buttonVariants({ variant: highlighted ? "default" : "outline" }),
							"w-full",
						)}
					>
						{ctaLabel}
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}
