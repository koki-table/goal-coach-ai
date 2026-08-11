import { buttonVariants } from "@/components/atom/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import {
	HERO_HEADLINE,
	HERO_REASSURANCE,
	HERO_SECONDARY_CTA,
	HERO_SUBHEADLINE,
} from "../config/marketingConfig";
import type { CtaTarget } from "../types";
import { FloatingBadge } from "./floatingBadge";

type HeroProps = {
	primaryCta: CtaTarget;
};

export function Hero({ primaryCta }: HeroProps) {
	return (
		<section className="relative overflow-hidden bg-gradient-to-br from-[var(--light-blue-50)] to-background">
			<div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24 md:px-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight md:text-5xl">{HERO_HEADLINE}</h1>
					<p className="mt-4 text-base text-muted-foreground md:text-lg">{HERO_SUBHEADLINE}</p>

					<div className="mt-8 flex flex-wrap items-center gap-3">
						<Link href={primaryCta.href} className={cn(buttonVariants({ size: "lg" }))}>
							{primaryCta.label}
						</Link>
						<a
							href={HERO_SECONDARY_CTA.href}
							className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
						>
							{HERO_SECONDARY_CTA.label}
						</a>
					</div>
					<p className="mt-3 text-xs text-muted-foreground">{HERO_REASSURANCE}</p>
				</div>

				<div className="relative mx-auto w-full max-w-sm">
					<Image
						src="/penguin-talk.png"
						alt="AIコーチ ペンタ君"
						width={480}
						height={480}
						priority
						className="w-full"
					/>
					<FloatingBadge
						label="今日のTODO"
						value="3 / 5 完了"
						className="-left-4 bottom-8 hidden sm:block"
					/>
					<FloatingBadge label="進捗率" value="72%" className="-right-2 top-8 hidden sm:block" />
				</div>
			</div>
		</section>
	);
}
