import { buttonVariants } from "@/components/atom/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { FINAL_CTA_HEADLINE, FINAL_CTA_SUBHEADLINE } from "../config/marketingConfig";
import type { CtaTarget } from "../types";

type FinalCtaProps = {
	primaryCta: CtaTarget;
};

export function FinalCta({ primaryCta }: FinalCtaProps) {
	return (
		<section className="bg-gradient-to-br from-[var(--light-blue-500)] to-[var(--light-blue-700)] py-16 text-center text-white md:py-24">
			<div className="mx-auto max-w-2xl px-4 md:px-6">
				<h2 className="text-2xl font-bold md:text-3xl">{FINAL_CTA_HEADLINE}</h2>
				<p className="mt-3 text-white/90">{FINAL_CTA_SUBHEADLINE}</p>
				<Link
					href={primaryCta.href}
					className={cn(
						buttonVariants({ size: "lg" }),
						"mt-8 bg-white text-primary hover:bg-white/90",
					)}
				>
					{primaryCta.label}
				</Link>
			</div>
		</section>
	);
}
