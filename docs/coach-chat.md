# AIコーチ チャット機能

`/coach` ページで、AIコーチと対話する機能。目標(Objective)ごとの通常スレッド(`objectiveStatus="decided"`)と、目標が未確定のユーザーが対話だけでObjective+Key Resultsを決められる探索スレッド(`objectiveStatus="undecided"`)の2種類がある。1回きりの提案ではなく、対話を重ねる中でAIが十分に状況を理解したと判断した段階で、Objective・Key Result・TODOの提案を行う。

## DB設計

### `coach_conversations`

目標(goal)ごとに1スレッド、または探索スレッドとして1本(ユーザーにつき1本まで)。

| カラム | 説明 |
|---|---|
| `id` | text PK (UUID) |
| `userId` | FK → `users.id`, `onDelete: cascade`。goalId がnull化されうるため、goal経由の推移従属排除は行わずここに直接持つ |
| `goalId` | FK → `goals.id`, `onDelete: set null`（`goals.categoryId` と同じnullableパターン）。目標削除後も会話履歴は残す。探索スレッドの間もnull |
| `objectiveStatus` | `"decided"` \| `"undecided"`。DBレベルでもCHECK制約(`chk_coach_conversations_objective_status`)で不正値を拒否する。探索スレッドが採用によりgoalスレッドへ遷移すると`"decided"`に変わる |
| `goalTitleSnapshot` / `goalDeadlineSnapshot` | 会話開始時点の目標タイトル・期限。目標削除後は `goals` テーブルから再現できない「その時点の事実」を保持する正当なスナップショット。**`objectiveStatus="undecided"`の間はこの列を「検討中のテーマラベル」の意味に拡張して使う**(初期値は定数`EXPLORATION_THREAD_LABEL`="目標を決める相談")。1列が`objectiveStatus`によって異なる意味を持つ意図的な設計判断で、理由は次の段落に明記する |
| `phase` | `"theme"` \| `"reality"` \| `"insight"` \| `"action"` \| `"closed"`。GROWサイクルに沿ったセッションフェーズ。DBレベルでもCHECK制約(`chk_coach_conversations_phase`)で不正値を拒否する。詳細は「セッションフェーズ」節を参照 |
| `turnsInPhase` | 同一`phase`に留まった往復数。ガードレール(`resolveNextPhase`)の強制前進判定に使う |
| `createdAt` / `updatedAt` | |

**`goalTitleSnapshot`をNOT NULLのまま維持する理由**: SQLiteでNOT NULLを外すとdrizzle-kitがテーブル再作成(新テーブル作成→データコピー→リネーム)を発行する。`coach_messages`が`coach_conversations`へのcascade FKを持つため、この形の移行はD1上で最も危険な変更になる。既存のスナップショット列を意味オーバーロードさせる方が、新規nullable列を追加するより安全と判断した。

**部分ユニークインデックス**: 探索スレッドはユーザーに1本だけ存在できる。

```sql
CREATE UNIQUE INDEX idx_coach_conversations_user_undecided_objective
  ON coach_conversations (userId)
  WHERE objectiveStatus = 'undecided' AND goalId IS NULL;
```

採用により`goalId`が入るとこの索引の対象から外れ、既存の`(userId, goalId)`ユニークインデックスが「1目標1スレッド」を引き継ぐ。SQLiteはNULL同士を区別するため、両方のユニークインデックスが同時に成立する。

### `coach_messages`

| カラム | 説明 |
|---|---|
| `id` | **integer autoincrement PK**（他テーブルはUUID text PKだが、カーソルページネーションの順序保証を優先した意図的な規約差異） |
| `conversationId` | FK → `coach_conversations.id`, `onDelete: cascade` |
| `role` | `"user"` \| `"assistant"` |
| `content` | メッセージ本文 |
| `proposal` | nullable JSON。提案(Objective+KR+TODO)と各項目の採用状態を保持 |
| `createdAt` | |

`proposal` の現行フォーマット(version:1エンベロープ):
```ts
type ProposalEnvelope = {
  version: 1;
  objective: { title: string; deadline: string | null; category: GoalCategoryType } | null;
  keyResults: { title: string; targetValue: number; unit: string; adopted: boolean; createdMilestoneId?: string }[];
  todos: { title: string; taskType: "daily" | "once"; adopted: boolean; createdTodoId?: string }[];
};
```

- `objective`は探索スレッドでのみ値を持つ。goalスレッドではサーバー側(`toProposalEnvelope`)で常に`null`へ強制される
- `keyResults`が1件以上ある場合、その`todos`は全てのKRが採用された後でなければ採用できない(Service層で強制)
- レガシー形式`{milestone: {...}|null, todos: [...]}`で保存された既存行は、読み取り時に`parseProposalPayload()`が上記version:1形式へ正規化する。**SQLマイグレーションは不要**(`proposal`は型なしJSON列のため、読み取り時の変換で後方互換を保つ)

**KR(Key Results)は新規DBエンティティではない**: `keyResults`は既存の`milestones`テーブル/`MilestoneRepository`の呼称変更であり、テーブル自体は無変更(採用時に`milestones`行を作る)。テーブル名と`proposal`ペイロード上の概念名(`keyResults`)が一致しないのは意図的な設計判断であり、遡及的なリネームは行わない。

### 正規化・将来拡張

`coach_conversations`/`coach_messages` は共に第3正規形(3NF)を満たす。`objectiveStatus`は`goalId`の値から導出できない独立した事実であり(`objectiveStatus='decided'`かつ`goalId IS NULL`という組み合わせも正当に存在する)、主キーにのみ関数従属するため推移的従属は発生しない。スナップショット列は非正規化ではなく、削除後に再現不可能な事実の保持である。

`coach_messages` は会話の生ログ(短期記憶)として設計し、`coach_messages.id` を安定した参照キーとして使えるようにしている。要約・埋め込み等の長期記憶層・ベクターDB移行は今回は実装しないが、将来必要になった際は `coach_messages.id` を外部キーとする新規テーブル(例: `coach_memory_embeddings`)を追加するだけで済み、既存テーブルの変更は不要という拡張余地を残している。

## APIエンドポイント

| Method | Path | 用途 |
|---|---|---|
| POST | `/coach/conversations` | goalスレッドの開始/取得 (`{ goalId }`) |
| POST | `/coach/conversations/exploration` | 探索スレッドの開始/取得(bodyなし)。`{ ...conversation, isNew }`を返す。第一声はまだ生成しない |
| POST | `/coach/conversations/:id/first-turn` | 探索スレッドの第一声を生成(bodyなし、SSE応答)。履歴が0件の場合のみ生成する(冪等性ガード)。`isNew: true`だった場合にフロントが1度だけ呼ぶ |
| GET | `/coach/conversations/:id/messages?cursor=&limit=` | 履歴取得(カーソルページネーション) |
| POST | `/coach/conversations/:id/messages` | メッセージ送信 (`{ content }`)、SSE応答 |
| POST | `/coach/messages/:id/adopt-plan-item` | KR・TODOの採用 (`{ target: "keyResult", keyResultIndex }` または `{ target: "todo", todoIndex }`)。`{ target: "milestone" }`はKR先頭(index 0)を指す旧クライアント互換のエイリアス |
| POST | `/coach/messages/:id/adopt-objective` | 探索スレッドで提案されたObjective+KRを1クリックで同時採用する(bodyなし) |

カーソルページネーションは `id` の降順で `limit + 1` 件取得してhasMoreを判定し、`id` が時系列と完全一致するため正確な順序を保証する。

レート制限: userロールメッセージ数が24時間で50件を超えると429。

## 第一声(オンボーディング)の設計

目標0件のユーザーが空のチャット欄の前で固まらないよう、探索スレッドには「AIから最初に問いかける」導線がある。設計上、以下の2点を両立させる必要があった:

1. 会話作成(`POST /conversations/exploration`)自体は、長時間かかるLLM呼び出しでブロックされてはならない
2. 「スレッドだけ在って第一声が無い」状態を安全に検知・再試行できる必要がある

この2点を満たすため、会話作成と第一声生成を**別エンドポイントに分離**した(`POST /conversations/exploration`→`POST /conversations/:id/first-turn`)。`first-turn`は「履歴が0件の場合のみ生成する」冪等性ガードを持つため、フロントが`isNew:true`を受け取った直後に1度だけ呼べば安全に第一声を得られ、失敗時も再訪時に自動でリトライされる。第一声生成が失敗した場合、会話行自体は既に作成済みのため「第一声なしのスレッド」として存続する(フロントは`isSending`表示のまま静かに終わり、ユーザーは通常のメッセージ送信で会話を継続できる)。

## プロンプト設計

ペルソナ `calmMentor`(ペンタ君)。言い切り体を維持しつつ、既定の振る舞いを「答えを与えず問いで引き出す」コーチングスタンスに転換している。

- 【口調】は変更なし
- 【関わり方】(旧【トーン&マナー】): データは断定の材料ではなく質問の材料にする。必ず「事実の提示→本人への問い」の順で書き、答えを先に言わない。1返信につき問いは1つ
- 【心理的安全性】(新設): 評価対象は観測可能な事実のみとし、人格への断定を禁止する。言い切り体を弱めるものではない
- 【目標を決める対話】(新設、探索スレッド時のみ注入): 何にワクワクするか→現状→3ヶ月後の理想像→定量化の4ビートで対話を進める
- 【提案タイミング】: ユーザーが自分の言葉で方向性を言い切った直後のみproposalを出す

出力スキーマ(`streamObject`のzodスキーマ。**tool呼び出しは使わない**、理由は次の段落):
```ts
{
  reply: string;
  proposal: {
    objective: { title: string; deadline: string | null; category: GoalCategoryType } | null;
    keyResults: { title: string; targetValue: number | null; unit: string | null }[];
    todos: { title: string; taskType: "daily" | "once" }[];
  } | null;
  phase?: "theme" | "reality" | "insight" | "action" | "closed"; // decidedスレッドのみAIが返す
}
```

`objective`は`objectiveStatus="undecided"`のスレッドのみで意味を持ち、`"decided"`のスレッドでは`toProposalEnvelope`がサーバー側で強制的に`null`にする。判断できない段階ではproposal自体をnullにして問いを続ける(ターン数などのハードガードはコード側に設けない)。

**tool呼び出しを採用しない理由(実装時の検証結果)**: Gemini(`gemini-3.5-flash-lite`)でtool定義付きの`generateText`/`streamText`を試したところ、「テキストのみ返してtool callを実行しない」「`toolChoice:required`では同一提案を複数回重複生成する」という不整合が実測で確認された。このため`coachModel.ts`は`streamObject`のまま、`reply`フィールドの部分文字列を先行して取り出す形を維持している。本issue(#50)のスキーマ変更(`planProposal`→`proposal{objective,keyResults,todos}`)も、この既存パターンをそのまま差し替えただけで、tool化は行っていない。

目標(goal)自体への改善提案(タイトル・期限の見直し)、既存Key Resultsへの改善コメントは、`reply` の自然文の中でのみ行う。構造化データ・採用ボタンは持たせない。

## セッションフェーズ

目標が確定した後の通常スレッド(`objectiveStatus="decided"`)は、目標ごとに1本、無期限に続く対話になる。フラットなチャットのままだと、ユーザーが核心的な話題を出しても、AIが深掘りを飛ばして助言・TODO提案に走ってしまう構造的な弱さがある。これを防ぐため、BetterUpのGoal→Reality & Vision→Insights→Actionのコーチングサイクルを参考に、`coach_conversations.phase`(`"theme"→"reality"→"insight"→"action"→"closed"`)でセッションの進行度を内部状態として保持する。

### 適用範囲: `decided`スレッドのみ

**探索スレッド(`objectiveStatus="undecided"`)にはGROWフェーズを適用しない。** 探索スレッドは既存の`EXPLORATION_ADDENDUM`(ワクワク→現状→期間/理想像→定量化の4ビート誘導、#50で実装)が「深掘りを飛ばして目標確定に走らない」という同じ目的を既に担保している。GROWフェーズを重ねて適用すると、プロンプト上で「4ビート」と「GROWフェーズ」という2つの構造化指示が競合し、AIの挙動が予測しにくくなる。

`phase`/`turnsInPhase`カラムは全conversation行(探索スレッドを含む)に存在するが、探索スレッドでは常に既定値(`"theme"`/`0`)のまま更新・参照しない。`CoachChatService.startMessageStream`では、`objectiveStatus === "decided"`の時だけ`conversation.phase`をプロンプトへ渡し、`persistCompletedTurn`でも`decided`の時だけフェーズ遷移ロジックを実行する。

### 決定権はAI、ガードレールはコード

「同一フェーズに留まるか進むか」の判断自体はAIに委ねる。ユーザーが核心的な話を始めた場面(例:「本当は今の勉強が意味あるのか疑ってる」)で機械的に次へ進めず、その場に留まって掘れるようにするためである。1ターン1段階で必ず前進させる方式は採らない。

一方、以下の不変条件はAIの出力を信用せず、`backend/src/features/coach/helpers/coachPhase.helper.ts`の`resolveNextPhase(current, declared, turnsInPhase)`がコード側で必ず矯正する:

- **同一フェーズに留まれるのは最大`MAX_TURNS_IN_PHASE`(=3)往復**。超えたら強制的に次のフェーズへ前進する(延々と掘り続けて次の一歩に着地しないセッションを防ぐ)
- **飛び級禁止**。2段階以上の前進は1段階に矯正する(深掘りを飛ばして`action`へ行けないようにする)
- **後退は`reality`まで**。`declared`が`reality`より前(`theme`)を指しても`reality`に矯正する(振り出しに戻さない)
- **不正な`declared`値**(未定義・スキーマ外の文字列)は現在のフェーズを維持したものとして扱う
- **`closed`はAIの自己申告では到達させない**。AIが`declared="closed"`を返しても`action`として扱う(頭打ち)。`closed`へ到達できるのは`action`で`MAX_TURNS_IN_PHASE`を超えた強制前進の時のみ。まだ話したいユーザーをAIが一方的に会話終了へ持ち込めないようにするための不変条件
- **`closed`は終端状態ではなく一時的なクーリングポイント**。`coach_conversations`は目標ごとに1本、無期限に続くため、`closed`到達後もユーザーが同じ会話でメッセージを送り続けるケースがある。この場合、`current === "closed"`の時は`declared`を見ずに常に`theme`へリセットし、新しいGROWサイクルを開始する

`resolveNextPhase`の返り値は矯正後の`{ phase, turnsInPhase }`のみで、矯正理由のログや説明は持たない。呼び出し側はこの返り値をそのまま`conversationRepo.setPhaseStmt`に渡すだけであり、モデル出力(`phase`宣言)をそのまま信用しないという不変条件をDB更新の直前でコードが必ず保証する構造になっている。

`persistCompletedTurn`では、user・assistantの2メッセージ書き込みと`setPhaseStmt`による`phase`/`turnsInPhase`更新を**同一の`db.batch`**でアトミックに実行する(`undecided`スレッドでは既存どおり`touchStmt`のみ)。

**既知の限界(テストで検出できない障害パターン)**: 現在のユニットテスト(`coachChatService.test.ts`)は`db.batch`を`vi.spyOn`でモック化しているため、「マイグレーション未適用でDBに`phase`/`turnsInPhase`列が存在せず、`persistCompletedTurn`のbatchが丸ごと失敗してメッセージ保存自体が失敗する」という種類の障害を検出できない(#51実装直後に実際にこの障害が発生した)。実DB(workerd/D1)を使った統合テストの整備は`@cloudflare/vitest-pool-workers`導入という既存テスト基盤への大きな変更を伴うため、本issueの範囲では対応せず、新規カラム追加時は`db:generate`後に必ず`db:migrate:local`を実行し忘れないことを運用上の注意点として明記する。

### フェーズごとの問いかけ

`objectiveStatus="decided"`のプロンプトには、探索スレッドの`EXPLORATION_ADDENDUM`と対になる`PHASE_ADDENDUM`(`backend/src/features/coach/prompts/coachPrompts.ts`)を注入する。各フェーズの狙いは以下の通り:

| phase | 狙い |
|---|---|
| `theme` | 今日話したい主題・関心を確認する |
| `reality` | 現状はどうか、理想の状態は何かを事実ベースで確認する |
| `insight` | なぜそう思うか、何が本当のブレーキか、本人の言葉で核心を掘る |
| `action` | 掘れた洞察を踏まえ、具体的な行動に落とす。**明日試せる粒度(1回・15分以内が目安)の単発TODOを必ず1つ以上提案する**(不変条件) |
| `closed` | セッション終了。新たな問いかけは行わない |

現在の`phase`とフェーズ別の問いの目安は、`buildChatUserPrompt`(`coachChatPrompt.helper.ts`)が`<session_state>`ブロックとしてプロンプトに注入する。`phase`が渡されない場合(探索スレッド)はこのブロック自体を出力しない。

### なぜ「小さな実験」という別概念を作らないか

当初BetterUpの「明日試せる小さな実験」を独立した概念・テーブル(`coach_experiments`)として持つ設計を検討したが、却下した。理由は既存TODOとの境界が運用で崩れること(AIが「毎朝15分やる」を実験として出せば実質TODOと区別がつかず、区別はプロンプト指示に依存し確実でない)、テーブル・リポジトリ・UIが二重化すること、ユーザーから見て「やること」がTODO画面とチャット内に散ること、である。代わりに、`action`フェーズの着地点は既存TODO(`taskType: "once"`の単発TODO)とし、プロンプト側で粒度を指示するだけで同じ意図を満たしている。

### なぜフェーズをUIに可視化しないか

`phase`は内部状態としてのみ保持し、フェーズインジケータ等のUIは作らない。「留まる判断」をAIに許しているため、インジケータがあると同一フェーズに留まっている間「進んでいない」ように見えてしまい逆効果になる。また、対話が仕組みっぽく見えるのを避ける狙いもある。このため`CoachConversationResponse`(APIレスポンス)にも`phase`を含めていない。

## 採用フロー

### KR・TODOの採用 (`adopt-plan-item`)

1. `target: "keyResult", keyResultIndex` — 対象KRが未採用なら`milestones`行を作成し、`adopted: true` + `createdMilestoneId` を書き込む
2. `target: "todo", todoIndex` — proposalにKRが1件以上ある場合、全KRが採用済みでなければ`MilestoneNotAdoptedYetError`で拒否する。全KR採用後(またはKRを伴わない単発TODO提案)であれば、`todos`行を作成し、`adopted: true` + `createdTodoId` を書き込む

同一項目への二重採用は `PlanItemAlreadyAdoptedError` で防止する。

### Objectiveの採用 (`adopt-objective`)

探索スレッドで提案されたObjective+KRは、**1クリックで同時採用**する(KR無しのObjectiveは作れない)。

1. カテゴリ解決(`resolveCategoryId`)。既定カテゴリの初回作成を伴うDB書き込みのため、batch前に実行する
2. `countActiveByUserId`でactive目標数の上限(`MAX_ACTIVE_GOALS=2`)チェック。超過なら`GoalLimitExceededError`
3. goalId + 各KRのidを事前採番
4. `db.batch([goalRepo.insertStmt, milestoneRepo.insertManyStmt, conversationRepo.linkGoalStmt, messageRepo.updateProposalStmt])`でgoal作成・KR作成・conversationのgoalスレッドへのリンク・proposal更新をアトミックに実行する

すでにgoalへリンク済みの探索スレッドへの再採用は`ExplorationThreadAlreadyLinkedError`、KRが既に採用済みなら`ObjectiveAlreadyAdoptedError`で拒否する。

## issue本文との相違点(実装時の判断)

このドキュメントが記述する実装は、起票時のissue文言と以下の点で異なる。実装の中で判明した制約に基づく判断であり、機能としての完了条件は満たしている。

- **tool化しない**: issue本文は「LLM出力スキーマはtoolのinputSchemaとして定義される」としていたが、上記の検証結果により`streamObject`のまま実装した
- **第一声のエンドポイント分離**: issue本文は「会話作成と同じdb.batch()に載せる」としていたが、「会話作成をLLM呼び出しでブロックしない」という要件と両立させるため、`POST /conversations/exploration`(会話作成のみ)と`POST /conversations/:id/first-turn`(第一声生成、履歴0件チェックで冪等)に分離した
- **GROWフェーズ(セッションフェーズ機構)は`decided`スレッドのみに適用**(issue #51): issue本文はスコープを明記していなかったが、探索スレッド(`undecided`)には適用しないと判断した。理由は「セッションフェーズ」節を参照
