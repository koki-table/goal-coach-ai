import { Badge } from "@/components/atom/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import { cn } from "@/lib/utils";
import { Check } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { PlanFeature } from "../types";

type PlanFeatureCardProps = {
	planName: string;
	priceLabel: string;
	priceUnit?: string;
	features: PlanFeature[];
	isCurrentPlan?: boolean;
	children?: ReactNode;
};

export function PlanFeatureCard({
	planName,
	priceLabel,
	priceUnit,
	features,
	isCurrentPlan,
	children,
}: PlanFeatureCardProps) {
	return (
		<div className="relative">
			{isCurrentPlan && (
				<Badge className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">ご利用中</Badge>
			)}
			<Card className={cn(isCurrentPlan && "border-primary shadow-md")}>
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
								<Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
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
					{children}
				</CardContent>
			</Card>
		</div>
	);
}
