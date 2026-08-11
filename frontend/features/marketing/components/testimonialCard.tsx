"use client";

import { Avatar, AvatarImage } from "@/components/atom/avatar";
import { Card, CardContent } from "@/components/atom/card";
import { Star } from "@phosphor-icons/react";
import type { TestimonialItem } from "../types";

const STAR_KEYS = ["star-1", "star-2", "star-3", "star-4", "star-5"] as const;

type TestimonialCardProps = {
	testimonial: TestimonialItem;
};

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="flex gap-0.5 text-warning">
					{STAR_KEYS.map((key) => (
						<Star key={key} weight="fill" className="size-4" />
					))}
				</div>
				<p className="text-sm text-foreground">「{testimonial.quote}」</p>
				<div className="flex items-center gap-3">
					<Avatar>
						<AvatarImage src="/penguin-icon.png" alt="" />
					</Avatar>
					<p className="text-xs text-muted-foreground">{testimonial.role}</p>
				</div>
			</CardContent>
		</Card>
	);
}
