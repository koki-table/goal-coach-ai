import type { CtaTarget } from "../types";
import { Footer } from "./footer";
import { Header } from "./header";

type LegalPageProps = {
	primaryCta: CtaTarget;
	title: string;
	children: React.ReactNode;
};

export function LegalPage({ primaryCta, title, children }: LegalPageProps) {
	return (
		<div>
			<Header primaryCta={primaryCta} />
			<main className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
				<h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
				<div className="mt-8 space-y-8 text-sm text-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-2 [&_p]:text-muted-foreground [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-muted-foreground">
					{children}
				</div>
			</main>
			<Footer />
		</div>
	);
}
