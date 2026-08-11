import { LegalPage } from "@/features/marketing/components/legalPage";
import { SUPPORT_EMAIL } from "@/features/marketing/config/marketingConfig";
import { resolvePrimaryCtaTarget } from "@/features/marketing/helpers/ctaTarget.helper";
import { auth } from "@clerk/nextjs/server";

export default async function ContactPage() {
	const { userId } = await auth();
	const primaryCta = resolvePrimaryCtaTarget(Boolean(userId));

	return (
		<LegalPage primaryCta={primaryCta} title="お問い合わせ">
			<p>
				サービスに関するご質問・不具合の報告・アカウントに関するご相談は、下記のメールアドレスまでご連絡ください。
			</p>
			<p>
				<a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
					{SUPPORT_EMAIL}
				</a>
			</p>
		</LegalPage>
	);
}
