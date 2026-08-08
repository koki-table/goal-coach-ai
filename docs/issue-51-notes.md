# issue #51 実装メモ（コミットしない・完了後に削除）

元Plan: `~/.claude/plans/https-github-com-koki-table-goal-coach-a-async-ritchie.md`

## 適用範囲（合意済み）

GROWフェーズ(theme→reality→insight→action→closed)は **`objectiveStatus="decided"`（通常スレッド）のみ**。
`undecided`（探索スレッド、#50実装済みの4ビート誘導 `EXPLORATION_ADDENDUM`）には適用しない。
理由: 4ビートが既に「深掘りを飛ばして目標確定に走らない」を担保済み。二重の構造化指示による競合を避ける。

`phase`/`turnsInPhase` カラムは全conversation行に存在するが、探索スレッドでは常に既定値(`'theme'`/`0`)のまま更新・参照しない。

## resolveNextPhase ロジック（coachPhase.helper.ts）

```ts
export const MAX_TURNS_IN_PHASE = 3; // module const

function resolveNextPhase(
  current: CoachSessionPhase,
  declared: string | undefined,
  turnsInPhase: number,
): { phase: CoachSessionPhase; turnsInPhase: number }
```

インデックス比較 (`coachSessionPhases.indexOf`):
1. `declared` が `coachSessionPhases` に含まれない → `declared = current` として扱う
2. 前進差分 >= 2（飛び級） → `current + 1` に矯正
3. 後退（`declaredIndex < currentIndex`） → `max(declaredIndex, realityIndex)` に矯正（theme禁止）
4. 結果 === current（留まる）→ `turnsInPhase >= MAX_TURNS_IN_PHASE` なら次へ強制前進+`turnsInPhase:0`、そうでなければ `turnsInPhase+1`
5. 結果 !== current → `turnsInPhase: 0`
6. `closed` を超えない（配列末尾でクランプ）

テストケース（coachPhase.helper.test.ts）:
- 現phase維持の許可
- MAX_TURNS_IN_PHASE超過時の強制前進
- 飛び級の矯正
- 後退の下限（realityより前に戻らない）
- 不正なdeclared値（undefined/スキーマ外文字列）

## 敵対的検証で確定した追加仕様（実装後に発覚・修正済み）

1. **closedはAIの自己申告では到達させない**: `declared`が`"closed"`の場合、`ACTION_INDEX`にクランプ（`action`扱い）。`closed`はコード側の強制前進（action + MAX_TURNS_IN_PHASE超過）でのみ生成する
2. **closedは終端状態ではなく一時的なクーリングポイント**: `current === "closed"`の場合、`declared`を無視して常に`{ phase: "theme", turnsInPhase: 0 }`を返す。理由: `coach_conversations`は目標ごとに無期限に続くため、closedを単純な終端にすると次ターンでAI(closedを知らない)が返す値を既存の後退矯正ロジックが誤って`action`等に戻してしまうバグがあった
3. テスト全14件（旧11件から4件入れ替え・追加）でパス確認済み
4. DBスキーマ整合性を検証する統合テスト(実D1使用)は`@cloudflare/vitest-pool-workers`導入という大きな変更を伴うため今回は対応せず、別チケットに切り出す方針。`docs/coach-chat.md`に既知の限界として明記済み

## 変更対象ファイル一覧

1. `backend/src/db/schema/constants.ts` — `coachSessionPhases`, `CoachSessionPhase`
2. `backend/src/db/schema/coachConversations.ts` — `phase`, `turnsInPhase` カラム + CHECK制約
3. `backend/src/db/schema/index.ts` — export追加
4. `backend/drizzle/migrations/` — `db:generate` で生成
5. `backend/src/features/coach/helpers/coachPhase.helper.ts` — 新規
6. `backend/src/features/coach/helpers/coachPhase.helper.test.ts` — 新規
7. `backend/src/features/coach/prompts/coachPrompts.ts` — `coachChatReplySchema.phase`, `PHASE_ADDENDUM`
8. `backend/src/features/coach/helpers/coachChatPrompt.helper.ts` — `phase`型変更, `PHASE_QUESTION_MENUS`, `<session_state>`
9. `backend/src/features/coach/helpers/coachChatPrompt.helper.test.ts` — テスト追加
10. `backend/src/features/coach/lib/coachOrchestrator.ts` — `turnResult.phase`
11. `backend/src/features/coach/lib/coachOrchestrator.test.ts` — テスト追加
12. `backend/src/features/coach/services/coachChatService.ts` — `resolveNextPhase`呼び出し、`db.batch`に`setPhaseStmt`
13. `backend/src/features/coach/services/coachChatService.test.ts` — テスト追加
14. `backend/src/common/repositories/coachConversationRepository.ts` — `setPhaseStmt`
15. `docs/coach-chat.md` — 「セッションフェーズ」節 + 「issue本文との相違点」に適用範囲の判断を追記

## 非対象

- フロントエンド変更なし
- `CoachConversationResponse`(api.ts) / `coachChatMapper.helper.ts` に `phase` を追加しない（UIに出さない方針）
- 新テーブル・新リポジトリ・新ルートなし
- 採用フロー(`adoptPlanItem`/`adoptObjective`)は無変更
