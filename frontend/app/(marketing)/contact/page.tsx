import { LegalPage } from "@/features/marketing/components/legalPage";
import { SUPPORT_EMAIL } from "@/features/marketing/config/marketingConfig";
import { resolvePrimaryCtaTarget } from "@/features/marketing/helpers/ctaTarget.helper";
import { buildPageMetadata } from "@/features/marketing/helpers/pageMetadata.helper";
import { auth } from "@clerk/nextjs/server";

export const metadata = buildPageMetadata(
	"お問い合わせ | AIコーチ ペンタ君",
	"AIコーチ ペンタ君に関するご質問・不具合の報告・アカウントに関するご相談はこちらからご連絡ください。",
	"/contact",
);

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
