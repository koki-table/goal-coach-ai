# issue #26 実装メモ（コミットしない・完了後に削除）

元Plan: `~/.claude/plans/https-github-com-koki-table-goal-coach-a-dapper-lynx.md`

## 適用範囲（合意済み）

Stripeで課金導線を作成する。プランは2つ:
- **Free**: ¥0。探索スレッド(`objectiveStatus="undecided"`)は無制限。目標確定後(`"decided"`)のコーチ相談は1日3回まで。モデルは常に `gemini-3.5-flash-lite`。
- **Pro**: ¥980/月 or ¥7,800/年（月額換算¥650、約34%オフ）。"無制限"訴求だが内部セーフガードとして1日100回(`decided`会話)まで`gemini-3.6-flash`を使用し、超過後はブロックせず`gemini-3.5-flash-lite`へ自動ダウングレード（ユーザーには見せない）。

`MAX_ACTIVE_GOALS=2`（`common/helpers/goalLimit.helper.ts`）は同時アクティブ目標数の既存制限で、本課金ロジックとは無関係。変更しない。

決済方式: Stripe Checkout（ホスト型）+ Customer Portal。Stripe Elements（埋め込みUI）は不採用。

**解約・返金方針**: 解約はStripe Customer Portalの標準機能に委任し、独自の解約ボタン/フローは実装しない。解約後も現在の課金期間終了までPro権限を保持する（`cancel_at_period_end`のデフォルト挙動、`customer.subscription.deleted`が実際に発火した時点でtier=freeに切り替える）。**返金は基本的に行わない**（返金ロジック・返金申請UIはスコープ外）。個別事情はStripeダッシュボードから手動対応。

## 既存の仕組みの再利用

- `coachConversations.objectiveStatus`（`"undecided"`/`"decided"`）の区別が、そのまま「探索は無制限／確定後は制限」の境界になる。新しい区分は不要。
- 現行のレート制限（`coachChatService.ts` `CHAT_DAILY_MESSAGE_LIMIT=50`、`countUserMessagesByUserIdSince`）は`decided`/`undecided`を区別せず全ユーザー共通。これを廃止し、tier-aware・`decided`限定のロジックに置き換える。

## userSubscriptions テーブルの規約

- **行が存在しない = free プラン**。既存ユーザーへのバックフィル不要。Stripe Checkout完了(`checkout.session.completed`)時に初めて行を作成する。
- 1ユーザー1行（サブスク履行履歴の複製はしない、Stripe側が真実源）。
- `tier`/`status`はCHECK制約でDBレベルに保証（既存の`chk_coach_conversations_objective_status`パターンに合わせる）。

## processedStripeEvents による冪等性

- Stripe event id をPKとして「insert-first」。unique制約違反 = 既処理として即200を返す（check-then-processによるTOCTOUを避ける）。

## CoachChatGate ロジック（coachChatGate.ts, 新規）

```ts
class CoachChatGate {
  private static readonly FREE_DAILY_DECIDED_LIMIT = 3;
  private static readonly PRO_DAILY_DECIDED_SOFT_LIMIT = 100;

  // decided会話用: {modelId, blocked} を返す
  // free: 3件以上でblocked=true、modelId=free常時
  // pro: 100件以上でもblocked=false、代わりにmodelIdをfreeモデルにダウングレード
  resolveForDecidedMessage(userId, sinceIso)

  // undecided会話用: 常にblocked=false。tierに応じたモデルのみ返す（カウントしない）
  resolveForUndecidedMessage(userId)
}
```

- 探索スレッド(undecided)はProなら常に`gemini-3.6-flash`（1ユーザー1本のDB制約で低ボリューム、無制限のままでもコストリスクは小さい）。
- `coachModel.ts`の`createCoachModel(env)`を`createCoachModel(env, modelId)`に変更。

## Cloudflare Workers特有の注意（Stripe Webhook）

- 署名検証は`stripe.webhooks.constructEventAsync(rawBody, signature, secret, undefined, Stripe.createSubtleCryptoProvider())`を使う（同期版`constructEvent`はNode cryptoに依存しWorkersで動かない）。
- 生ボディは`c.req.text()`で取得し、`c.req.json()`を先に呼ばない。
- Webhookルート(`/webhooks/stripe`)は`protectedRoutes`ではなく`/health`と同じ公開ルート枠に登録する。

## フロントエンド実装の要点

`features/goals`/`features/coach`の既存構成・パターンに厳密に合わせる。

- **`useSubscription`**: `useGoals`と同じSWRパターン（`useAuth`でトークン取得、`isLoaded && isSignedIn`をキー条件、`SwrResponse<T>`型を再利用）。
- **absence-of-row(=free)の正規化はバックエンド側で完結**させる。`GET /billing/status`は常に`{tier, status, decidedMessagesUsedToday}`の形で正規化済みレスポンスを返すため、フロントはundefined分岐を書かない。
- **`usageDisplay.helper.ts`**: 残数表示（`本日の残り: N回`）はpure関数として切り出し、`.helper.test.ts`をペアで書く（0/1/2/3/4件目でのクランプ確認）。Pro向けの非表示分岐はcomponent側の`tier`判定のみで行い、helperにpro分岐は持たせない（単一責務）。
- **`planCard.tsx`**: pure component、propsのみ。free=残数表示+アップグレードCTA、pro(active)=「実質無制限」固定文言（残数は一切表示しない）、pro(past_due)=支払い方法更新バナーを追加。
- **`/settings/billing/page.tsx`**: `coach/page.tsx`と同じ構成（`useSearchParams`利用のためSuspenseラップ、page.tsxでProvider設置）。
- **ナビゲーション**: `lib/constants.ts`の`NAV_ITEMS`に「プラン設定」追加、`sidebar.tsx`の`iconMap`に`CreditCard`アイコン追加。
- **コーチ画面の残数バッジ**: `coachContext.tsx`が既に`features/goals/hooks/useGoals`をimportしている先例があるため、`useSubscription`(billing feature)のimportも同様に許容する。free限定でチャット入力欄付近に表示、proは何も出さない。
- **429エラー文言**: バックエンドが`reason: "freeTierDailyLimit"`をbodyに含めるようにし、既存の409`goalLimitExceeded`と同じ`extractReason`の仕組みで`coachErrorMessage.helper.ts`に分岐追加。「24時間で50件」の文言を「本日3回」+Pro案内に更新。

## 変更対象ファイル一覧

1. `backend/src/db/schema/constants.ts` — `subscriptionTiers`, `subscriptionStatuses`
2. `backend/src/db/schema/userSubscriptions.ts` — 新規
3. `backend/src/db/schema/processedStripeEvents.ts` — 新規
4. `backend/src/db/schema/coachMessages.ts` — `model`列追加（nullable）
5. `backend/src/db/schema/index.ts` — export追加
6. `backend/drizzle/migrations/` — `db:generate`で生成（次は`0009_*.sql`、既存最新は`0008_mute_invaders.sql`）
7. `backend/src/common/repositories/subscriptionRepository.ts` — 新規
8. `backend/src/common/repositories/coachMessageRepository.ts` — `countUserMessagesByUserIdSince`に`objectiveStatus`フィルタ追加、`model`列対応
9. `backend/src/types/env.ts` — `STRIPE_SECRET_KEY?`, `STRIPE_WEBHOOK_SECRET?`, `STRIPE_PRICE_ID_MONTHLY?`, `STRIPE_PRICE_ID_YEARLY?`
10. `backend/src/features/billing/routes/billingRoute.ts` — 新規（POST /checkout, /portal, GET /status）
11. `backend/src/features/billing/routes/billingWebhookRoute.ts` — 新規（POST /webhooks/stripe、公開ルート）
12. `backend/src/features/billing/services/billingService.ts` — 新規
13. `backend/src/features/billing/services/stripeWebhookService.ts` — 新規
14. `backend/src/features/coach/config/coachModelConfig.ts` — 新規（`COACH_MODEL_FREE`/`COACH_MODEL_PRO`定数）
15. `backend/src/features/coach/services/coachChatGate.ts` — 新規
16. `backend/src/features/coach/services/coachChatGate.test.ts` — 新規
17. `backend/src/features/coach/lib/coachModel.ts` — `createCoachModel(env, modelId)`に変更
18. `backend/src/features/coach/services/coachChatService.ts` — `CHAT_DAILY_MESSAGE_LIMIT`削除、`CoachChatGate`呼び出しに置き換え
19. `backend/src/features/coach/services/coachChatService.test.ts` — テスト更新
20. `backend/src/features/billing/services/stripeWebhookService.test.ts` — 新規
21. `backend/src/common/errors.ts` — `NoStripeCustomerError`, `BillingNotConfiguredError`
22. `backend/src/common/validators.ts` — `billingCheckoutSchema`
23. `backend/src/routes/index.ts` — `/billing`（protected）、`/webhooks/stripe`（public）登録
24. `backend/wrangler.toml` / `.dev.vars` — Stripe価格ID(vars)・シークレット
25. `frontend/features/billing/types/index.ts` — 新規（`SubscriptionTier`, `SubscriptionStatus`, `BillingStatus`）
26. `frontend/features/billing/config/billingConfig.ts` — 新規（`FREE_DAILY_DECIDED_LIMIT`等）
27. `frontend/features/billing/schemas/billingSchema.ts` — 新規
28. `frontend/features/billing/helpers/usageDisplay.helper.ts` — 新規
29. `frontend/features/billing/helpers/usageDisplay.helper.test.ts` — 新規
30. `frontend/features/billing/hooks/useSubscription.ts` — 新規（`useGoals`と同型のSWRフック）
31. `frontend/features/billing/hooks/useCheckout.ts` — 新規
32. `frontend/features/billing/hooks/useBillingPortal.ts` — 新規
33. `frontend/features/billing/contexts/billingContext.tsx` — 新規
34. `frontend/features/billing/components/planCard.tsx` — 新規
35. `frontend/features/billing/components/planCard.test.tsx` — 新規
36. `frontend/app/(app)/settings/billing/page.tsx` — 新規（`coach/page.tsx`と同型のSuspense+Provider構成）
37. `frontend/lib/constants.ts` — NAV_ITEMSに「プラン設定」追加
38. `frontend/components/layout/sidebar.tsx` — `iconMap`に`CreditCard`追加
39. `frontend/features/coach/contexts/coachContext.tsx` — `useSubscription()`追加、free限定の残数バッジ用の値をexpose
40. `frontend/app/(app)/coach/page.tsx` — free限定の残数バッジ表示
41. `frontend/features/coach/helpers/coachErrorMessage.helper.ts` — 429文言更新、`reason: "freeTierDailyLimit"`判定追加

## 着手前の懸念事項（ブランチを切って対応する前に）

1. **PRの粒度**: スキーマ・billing基盤・coachゲート・フロント一式で差分が非常に大きくなる。ロールアウト順序（スキーマ→billing基盤→coachゲート→フロント）は各段階が単独デプロイ可能な設計にしているので、そのままブランチ/PRを4本程度に分割するのを推奨。レビューもしやすくなる。
2. **Stripeダッシュボード側の準備はコード外**: テストモードのProduct/Price作成、Webhookエンドポイント登録、`whsec_`シークレットの取得はリポジトリ外の作業。ローカルで`stripe listen`を使ったWebhook検証をするなら着手前か並行して準備が必要（人手で行う。エージェントは代行できない）。
3. **マイグレーション番号の衝突リスク**: 次のマイグレーションは`0009`想定だが、これは現時点の`main`が最新という前提。作業中に他のブランチが先に`main`へマイグレーションを追加すると番号が衝突するので、マージ直前に`db:generate`を再実行して確認する。
4. **既存ユーザーへの挙動変化**: `coachChatGate`導入の段階で、全ユーザーが「フラット50件/日」→「無料は3件/日（decided限定）」に変わる。このPRのマージタイミング＝挙動変化のタイミングになるので、リリース告知や文言の準備をこのフェーズのPRに合わせて考えておく。

## 非対象

- Stripe Elements（埋め込み決済UI）
- サブスク履行履歴テーブル（Stripe側を真実源とし複製しない）
- Proユーザーへの残数/ダウングレード状況の可視化（"無制限"訴求と矛盾するため非表示のまま）
