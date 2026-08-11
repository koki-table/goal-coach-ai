import { LegalPage } from "@/features/marketing/components/legalPage";
import { SUPPORT_EMAIL } from "@/features/marketing/config/marketingConfig";
import {
	resolveLogoHref,
	resolvePrimaryCtaTarget,
} from "@/features/marketing/helpers/ctaTarget.helper";
import { buildPageMetadata } from "@/features/marketing/helpers/pageMetadata.helper";
import { auth } from "@clerk/nextjs/server";

export const metadata = buildPageMetadata(
	"プライバシーポリシー | AIコーチ ペンタ君",
	"AIコーチ ペンタ君における利用者情報の取り扱いについて定めたプライバシーポリシーです。",
	"/privacy",
);

export default async function PrivacyPage() {
	const { userId } = await auth();
	const isSignedIn = Boolean(userId);
	const primaryCta = resolvePrimaryCtaTarget(isSignedIn);

	return (
		<LegalPage
			primaryCta={primaryCta}
			logoHref={resolveLogoHref(isSignedIn)}
			title="プライバシーポリシー"
		>
			<p>
				「AIコーチ
				ペンタ君」(以下「本サービス」)における利用者情報の取り扱いについて、以下のとおり定めます。
			</p>

			<h2>1. 取得する情報</h2>
			<ul>
				<li>認証サービス(Clerk)を通じたユーザー識別情報</li>
				<li>
					目標・Key Results・TODO・AIコーチとの対話内容など、本サービスの利用に伴い入力される情報
				</li>
				<li>Proプランご利用時の決済情報(Stripeが管理するお支払い情報)</li>
			</ul>

			<h2>2. 利用目的</h2>
			<ul>
				<li>本サービスの提供・維持・改善のため</li>
				<li>AIコーチによる目標分解・進捗フィードバックの提供のため</li>
				<li>Proプランのお支払い管理のため</li>
				<li>お問い合わせへの対応のため</li>
			</ul>

			<h2>3. 第三者への提供</h2>
			<p>本サービスは、以下の外部サービスを利用しています。</p>
			<ul>
				<li>Clerk(認証情報の管理)</li>
				<li>Stripe(決済処理・お支払い情報の管理)</li>
				<li>
					Google Gemini(AIコーチの対話・提案生成のため、目標やTODO、対話内容の一部を送信します)
				</li>
			</ul>
			<p>上記以外の目的で、利用者情報を第三者に提供することはありません。</p>

			<h2>4. Cookie・トラッキングについて</h2>
			<p>本サービスでは、アクセス解析ツールやトラッキングCookieは使用していません。</p>

			<h2>5. データの削除について</h2>
			<p>
				目標・TODOは本サービスの管理画面から個別に削除いただけます。アカウント全体の削除やその他のデータ削除をご希望の場合は、お問い合わせ先までご連絡ください。
			</p>

			<h2>6. お問い合わせ</h2>
			<p>本ポリシーに関するお問い合わせは、以下のメールアドレスまでご連絡ください。</p>
			<p>
				<a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
					{SUPPORT_EMAIL}
				</a>
			</p>
		</LegalPage>
	);
}
