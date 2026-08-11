"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import {
	ChartLineUp,
	ChatCircleDots,
	CheckSquare,
	Clock,
	Sparkle,
	Target,
} from "@phosphor-icons/react";
import type { FeatureItem } from "../types";

const iconMap = {
	Target,
	ChatCircleDots,
	CheckSquare,
	ChartLineUp,
	Sparkle,
	Clock,
} as const;

type FeatureCardProps = {
	feature: FeatureItem;
};

export function FeatureCard({ feature }: FeatureCardProps) {
	const Icon = iconMap[feature.icon];

	return (
		<Card>
			<CardHeader>
				<div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
					<Icon className="size-5" />
				</div>
				<CardTitle>{feature.title}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-sm text-muted-foreground">{feature.description}</p>
			</CardContent>
		</Card>
	);
}
