import { Faq } from "@/features/marketing/components/faq";
import { FeatureGrid } from "@/features/marketing/components/featureGrid";
import { FinalCta } from "@/features/marketing/components/finalCta";
import { Footer } from "@/features/marketing/components/footer";
import { Header } from "@/features/marketing/components/header";
import { Hero } from "@/features/marketing/components/hero";
import { HowItWorks } from "@/features/marketing/components/howItWorks";
import { Pricing } from "@/features/marketing/components/pricing";
import { Testimonials } from "@/features/marketing/components/testimonials";
import { resolvePrimaryCtaTarget } from "@/features/marketing/helpers/ctaTarget.helper";
import { buildPageMetadata } from "@/features/marketing/helpers/pageMetadata.helper";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata = buildPageMetadata(
	"AIコーチ ペンタ君 | 目標をOKRで分解し、AIコーチと一緒に達成する",
	"学ぶ意思はあっても、続ける仕組みがない。ペンタ君が目標をOKRに分解し、毎日のTODOと対話で挫折を防ぎます。",
	"/",
);

export default async function MarketingPage() {
	const { userId } = await auth();
	if (userId) {
		redirect("/goals");
	}

	const primaryCta = resolvePrimaryCtaTarget(false);

	return (
		<div>
			<Header primaryCta={primaryCta} logoHref="/" />
			<main>
				<Hero primaryCta={primaryCta} />
				<FeatureGrid />
				<HowItWorks />
				<Testimonials />
				<Pricing primaryCta={primaryCta} />
				<Faq />
				<FinalCta primaryCta={primaryCta} />
			</main>
			<Footer />
		</div>
	);
}
