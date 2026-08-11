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
import { auth } from "@clerk/nextjs/server";

export default async function MarketingPage() {
	const { userId } = await auth();
	const primaryCta = resolvePrimaryCtaTarget(Boolean(userId));

	return (
		<div>
			<Header primaryCta={primaryCta} />
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
