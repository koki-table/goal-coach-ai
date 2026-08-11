import { LegalPage } from "@/features/marketing/components/legalPage";
import { SUPPORT_EMAIL } from "@/features/marketing/config/marketingConfig";
import { resolvePrimaryCtaTarget } from "@/features/marketing/helpers/ctaTarget.helper";
import { buildPageMetadata } from "@/features/marketing/helpers/pageMetadata.helper";
import { auth } from "@clerk/nextjs/server";

export const metadata = buildPageMetadata(
	"利用規約 | AIコーチ ペンタ君",
	"AIコーチ ペンタ君の利用条件を定める利用規約です。",
	"/terms",
);

export default async function TermsPage() {
	const { userId } = await auth();
	const primaryCta = resolvePrimaryCtaTarget(Boolean(userId));

	return (
		<LegalPage primaryCta={primaryCta} title="利用規約">
			<p>本規約は、「AIコーチ ペンタ君」(以下「本サービス」)の利用条件を定めるものです。</p>

			<h2>1. サービス概要</h2>
			<p>
				本サービスは、目標をOKR(Objective / Key
				Results)形式に分解し、AIコーチとの対話やTODO管理を通じて目標達成を支援するサービスです。
			</p>

			<h2>2. 利用登録</h2>
			<p>
				本サービスの利用には、認証サービス(Clerk)を通じたアカウント登録が必要です。登録情報の管理はClerkの利用条件にも従います。
			</p>

			<h2>3. 禁止事項</h2>
			<ul>
				<li>法令または公序良俗に違反する行為</li>
				<li>本サービスのシステムに不当な負荷をかける行為・不正アクセス</li>
				<li>他の利用者になりすます行為</li>
				<li>本サービスを通じて得た情報を目的外に利用する行為</li>
			</ul>

			<h2>4. 料金・お支払い</h2>
			<p>
				本サービスにはFreeプランとProプランがあります。Proプランへのお支払いはStripeを通じて処理され、決済情報の管理はStripe
				Customer
				Portalで行います。プランの詳細・利用制限は本サービスの料金ページに記載の内容によります。
			</p>

			<h2>5. 免責事項</h2>
			<p>
				本サービスはAIによる提案・フィードバックを提供しますが、目標達成や効果を保証するものではありません。本サービスの利用により生じた損害について、当運営者は故意または重大な過失がある場合を除き責任を負いません。
			</p>

			<h2>6. サービス内容の変更・終了</h2>
			<p>
				当運営者は、利用者への事前告知の上、本サービスの内容を変更または終了することがあります。
			</p>

			<h2>7. 規約の変更</h2>
			<p>
				当運営者は本規約を変更することがあります。変更後の規約は本ページに掲載した時点から効力を持ちます。
			</p>

			<h2>8. お問い合わせ</h2>
			<p>本規約に関するお問い合わせは、以下のメールアドレスまでご連絡ください。</p>
			<p>
				<a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
					{SUPPORT_EMAIL}
				</a>
			</p>
		</LegalPage>
	);
}
