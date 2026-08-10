# issue #49 実装メモ（コミットしない・完了後に削除）

元Plan: `~/.claude/plans/https-matz-tak-github-io-ai-sloppy-lp-happy-parnas.md`

## 適用範囲（合意済み）

`/` を認証保護のダッシュボードから、誰でも見られる公開LPに切り替える。構成は https://matz-tak.github.io/ai-sloppy/ の大枠（Header→Hero→Features→How it works→Highlights→Testimonials→Pricing→FAQ→Final CTA→Footer）を参考にするが丸パクリはしない。デザインテイストは https://payn.io/ のフローティングUIバッジ手法を参考にしつつ、配色は本リポジトリ `app/globals.css` の既存デザイントークン（Light Blue系Primary）のみを使う。紫など新しい色相は追加しない。

コンテンツは `/Users/koki/pre-project/presentation-slides/presentations/goal-coach-ai/slides.md`（AIハッカソン説明資料）を参照して作成する。

- 「10,000社以上のチームに信頼されています」等の誇張実績訴求は使わない
- エンタープライズプランは非表示（Free/Proの2プランのみ）
- お客様の声セクションは実データがないため、想定ユーザー像に基づいた自然な声を作成する（「サンプル」ラベルは付けない）
- issue本文にあった「デザイン.md」「コンテンツ.md」はリポジトリに存在しないため対象外。CLAUDE.md/`.claude/rules/frontend.md`（デザイントークン・アーキテクチャルール）と slides.md を正式な参照元とする

## ルーティング変更

現状:
- `frontend/middleware.ts`: `isPublicRoute` は `/sign-in(.*)`, `/sign-up(.*)` のみ。それ以外は `auth.protect()`。
- `frontend/next.config.ts`: `/ → /goals` の redirect（コメント「ダッシュボードは一旦非表示」）。
- `frontend/app/(app)/page.tsx`: 簡易ダッシュボード（達成確率・進行中目標・本日のToDo）。`(app)` route groupが `/`, `/goals`, `/todos`, `/coach`, `/settings/billing` を保護。

変更方針:
1. `middleware.ts` の `isPublicRoute` に `"/"` を追加し、`/` を認証チェック対象外にする
2. `next.config.ts` の `/ → /goals` redirect を削除する
3. 新規route group `frontend/app/(marketing)/page.tsx` に公開LPを実装する
4. 既存ダッシュボード `(app)/page.tsx` は `(app)/dashboard/page.tsx` に移動（`/dashboard`）。Next.jsのroute group仕様上、`/` を2つのグループで持つと衝突するため。`lib/constants.ts` の `NAV_ITEMS` は変更不要（元々ダッシュボードへの直接リンクはナビになし）
5. ログイン済みユーザーが `/` を訪れた場合は強制リダイレクトせず、LPを表示しつつCTAのラベル・行き先だけ変える。`app/(marketing)/page.tsx` をサーバーコンポーネントとし `@clerk/nextjs/server` の `auth()` で `isSignedIn` を判定、各セクションにpropsで渡す。ログイン済みなら「無料で始める」→「アプリを開く」、リンク先を `/sign-up` → `/goals` に変更

## `features/marketing/` の構成

CLAUDE.mdの `features/{name}/` 構成に従うが、LPは静的コンテンツ中心のため**contexts/hooksは新設しない**（データフェッチが発生しないため）。FAQのアコーディオン開閉、Pricingの月次/年次トグルはUIローカルな `useState` のみで十分（CLAUDE.mdの「hooksはcontext内のみ」はデータ取得hookを指し、UI限定の状態は対象外）。

```
frontend/features/marketing/
├── components/
│   ├── header.tsx           # ロゴ+ナビ(機能/仕組み/料金/FAQ)+CTA、isSignedIn受け取り
│   ├── hero.tsx              # 見出し+サブ+2CTA+安心文言+ペンギンイラスト+フローティングバッジ
│   ├── floatingBadge.tsx     # payn風のフローティングUIバッジ（Hero内の装飾）
│   ├── featureGrid.tsx       # 3列×2行の機能カード
│   ├── featureCard.tsx       # 単一カード（アイコン+タイトル+説明）
│   ├── howItWorks.tsx        # 3ステップの円形ナンバリング+ヒントボックス
│   ├── highlights.tsx        # 2x2グリッド（進捗エンジン訴求）
│   ├── testimonials.tsx      # 3列の声カード
│   ├── testimonialCard.tsx   # 単一カード（星+引用+アバター+名前+役職）
│   ├── pricing.tsx           # Free/Proプラン比較+月次/年次トグル
│   ├── pricingCard.tsx       # 単一プランカード
│   ├── faq.tsx                # アコーディオン形式
│   ├── finalCta.tsx          # グラデーション帯+見出し+CTA
│   └── footer.tsx            # ロゴ+リンク3カラム+コピーライト（法務リンクは「準備中」表示で位置だけ確保）
├── helpers/
│   ├── yearlyDiscount.helper.ts       # (monthly, yearly) => 割引率・お得額を返す純粋関数
│   ├── yearlyDiscount.helper.test.ts
│   ├── ctaTarget.helper.ts            # isSignedIn => {label, href} を返す純粋関数
│   └── ctaTarget.helper.test.ts
├── config/
│   └── marketingConfig.ts    # 全セクションのコピー文言・数値・FAQ/Testimonials配列を集約
└── types/
    └── index.ts              # FeatureItem, TestimonialItem, FaqItem 等の型
```

`app/(marketing)/page.tsx` は `auth()` で `isSignedIn` を取得し、`marketingConfig.ts` の定数と併せて各セクションにpropsで配布するだけの薄いサーバーコンポーネント。Pricingは既存の `features/billing/config/billingConfig.ts` の `FREE_DAILY_DECIDED_LIMIT`, `MONTHLY_PRICE_JPY`, `YEARLY_PRICE_JPY` をそのまま再利用する（値の重複を避ける）。

## 各セクションのコピー文言（案）

- **Header**: ロゴ「AIコーチ ペンタ君」/ nav「機能」「仕組み」「料金」「FAQ」/ CTA「無料で始める」（ログイン時「アプリを開く」）
- **Hero**: 見出し「ペンギンコーチが、あなたの目標達成に伴走する。」/ サブ「学ぶ意思はあっても、続ける仕組みがない。ペンタ君が目標をOKRに分解し、毎日のTODOと対話で挫折を防ぎます。」/ CTA1「無料で始める」→`/sign-up`、CTA2「使い方を見る」→`#how-it-works`／安心文言「クレジットカード不要 / 1日3回まで無料でコーチに相談できます」／ビジュアルは `penguin-talk.png` を中心に、`floatingBadge.tsx` で「今日のTODO 3/5完了」等の小カードを重ねる
- **Features（6項目）**: OKRで目標を分解／AIコーチと対話／日々のTODO管理／進捗を可視化（TODO完了率70%+KR達成率30%）／率直なフィードバック／1日5分で回る（3タッチ）
- **How it works（3ステップ）**: 目標を決める → ペンタ君と対話してKRとTODOに分解 → 毎日こなして進捗を可視化。ヒント「Key Resultsは60〜70%到達で大成功。100%届く目標は低すぎるペン。」
- **Highlights（実装済み事実ベース、誇張数値は使わない）**: 進捗率の算出式／Freeでも1日3回まで相談可／サーバーレスでAI原価は月数円→フリーミアムが成立／Cloudflare Workers上で稼働
- **Testimonials（3件、想定ユーザー像の自然な声）**: 資格勉強を独学で挫折していた人／転職準備でタスクが多すぎて迷子だった人／進捗が数字で見えて助かっている人。それぞれ名前・属性を添える
- **Pricing**: Free（¥0、目標・TODO管理無制限、コーチ対話1日3回まで）/ Pro（月¥980・年¥7,800、対話・提案無制限、一番人気バッジ）。未実装機能（自律エージェント等）には「近日提供」バッジを付け誇大表示を避ける。Enterpriseは非表示
- **FAQ（5項目）**: 無料の範囲／カード登録の要否／OKRとは／AIの伴走の実態／開発体制（1名・Claude Codeによる開発、AIハッカソン一次審査通過）
- **Final CTA**: 「『学びが続かない』を、ペンタ君の伴走で終わらせる。」+ CTA
- **Footer**: ロゴ+3カラム（プロダクト／開発ストーリー・技術スタック／お問い合わせ）+ 準備中扱いの利用規約・プライバシーポリシーリンク + コピーライト

## デザイントークンの使い方

- 新しい色相は追加しない。既存Primitiveの `--light-blue-500`〜`--light-blue-700` の濃淡グラデーションで、ai-sloppyのような華やかさを表現する（紫は使わない）。Hero/Final CTA背景は `bg-gradient-to-br from-[var(--light-blue-500)] to-[var(--light-blue-700)]` 等、Tailwindの任意値記法でPrimitiveを直接参照
- グラデーションを複数箇所で使うなら、`app/globals.css` の `:root` に `--gradient-hero-from: var(--light-blue-500)` / `--gradient-hero-to: var(--light-blue-700)` のようなSemantic変数を追記し、`@theme inline` にも登録する（ハードコードカラーコード禁止）
- payn風のフローティングバッジは `Card` 相当のスタイル（`rounded-xl border-border bg-card shadow-lg`）+ `absolute` 配置で表現
- アニメーションは既存の `tw-animate-css`（導入済み）のユーティリティと CSS `transition`/`@keyframes` の範囲に収める。framer-motionは追加しない

## 使用コンポーネント・追加要否

既存 `components/atom/` の `button`, `card`, `badge`, `separator`, `avatar`, `progress` を再利用。

FAQのアコーディオンは shadcn CLIで `accordion` を追加生成する（`@base-ui/react/accordion` は依存済み、ラッパーコンポーネントのみ未生成）。Pricingの月次/年次トグルはUIローカルな `useState` + 既存 `Button` の排他選択で実装し、新規コンポーネント追加は避ける（Tabsコンポーネント追加は不要と判断）。

アイコンは `@phosphor-icons/react`（プロジェクト実績あり、`components.json` の `iconLibrary: lucide` はshadcn生成時設定のみで実コードはphosphor使用）。

## 画像アセット

`frontend/public/` の既存ペンギン画像を使用: `penguin-talk.png`（Heroメイン）、`penguin-glad.png`（Testimonials/Final CTA付近）、`penguin-icon.png`（Header/Footerロゴ）、`penguin.png`（予備）。いずれも `next/image` で読み込み、Hero画像のみ `priority` を付与。ファイルサイズが大きい（1.2MB超）ため、`sizes`/`width`/`height` を適切に設定しLCPへの影響を確認する。

## テスト方針

- `yearlyDiscount.helper.ts`, `ctaTarget.helper.ts` は純粋関数のため `.helper.test.ts` を必須で書く（Vitest）
- 他の静的セクションコンポーネントは表示のみでロジックを持たないため、コンポーネント単体テストは必須にしない

## 変更対象ファイル一覧

1. `frontend/middleware.ts` — `isPublicRoute` に `"/"` 追加
2. `frontend/next.config.ts` — `/ → /goals` redirect削除
3. `frontend/app/(app)/page.tsx` → `frontend/app/(app)/dashboard/page.tsx` に移動
4. `frontend/app/(marketing)/page.tsx` — 新規（サーバーコンポーネント、`auth()`判定+セクション組み立て）
5. `frontend/components/atom/accordion.tsx` — shadcn CLIで新規生成
6. `frontend/features/marketing/config/marketingConfig.ts` — 新規
7. `frontend/features/marketing/types/index.ts` — 新規
8. `frontend/features/marketing/helpers/yearlyDiscount.helper.ts` — 新規
9. `frontend/features/marketing/helpers/yearlyDiscount.helper.test.ts` — 新規
10. `frontend/features/marketing/helpers/ctaTarget.helper.ts` — 新規
11. `frontend/features/marketing/helpers/ctaTarget.helper.test.ts` — 新規
12. `frontend/features/marketing/components/*.tsx` — 新規（header, hero, floatingBadge, featureGrid, featureCard, howItWorks, highlights, testimonials, testimonialCard, pricing, pricingCard, faq, finalCta, footer）
13. `frontend/app/globals.css` — グラデーション用Semantic変数（必要な場合のみ）

## 着手前の懸念事項

1. **ダッシュボード移動の影響範囲**: `(app)/page.tsx` → `(app)/dashboard/page.tsx` 移動時、ログイン直後の遷移先が `/` を前提にしていないか確認する（Clerkの `afterSignInUrl`/`fallbackRedirectUrl` 系設定は `.env.local` に無いことを確認済み。`sign-in`/`sign-up` ページ自体は特にリダイレクト先を指定していないため、影響は小さい見込み）
2. **画像サイズ**: ペンギン画像が1.2MB超と大きく、Hero表示時のLCPに影響しうる。実装時に圧縮版に差し替えるか、`next/image` の最適化に委ねるかを判断する

## 非対象

- Enterpriseプラン表示
- 「10,000社以上」等の誇張実績訴求
- framer-motion等の新規アニメーションライブラリ追加
- Tabsコンポーネントの新規追加（Pricingトグルはローカルstateで対応）
