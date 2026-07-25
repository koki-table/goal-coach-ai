# AIコーチ チャット機能

`/coach` ページで、目標ごとにAIコーチとチャット形式で対話する機能。1回きりの提案ではなく、対話を重ねる中でAIが十分に状況を理解したと判断した段階で、マイルストーンとTODOの提案を行う。

## DB設計

### `coach_conversations`

目標(goal)ごとに1スレッド。

| カラム | 説明 |
|---|---|
| `id` | text PK (UUID) |
| `userId` | FK → `users.id`, `onDelete: cascade`。goalId がnull化されうるため、goal経由の推移従属排除は行わずここに直接持つ |
| `goalId` | FK → `goals.id`, `onDelete: set null`（`goals.categoryId` と同じnullableパターン）。目標削除後も会話履歴は残す |
| `goalTitleSnapshot` / `goalDeadlineSnapshot` | 会話開始時点の目標タイトル・期限。目標削除後は `goals` テーブルから再現できない「その時点の事実」を保持する正当なスナップショット |
| `createdAt` / `updatedAt` | |

### `coach_messages`

| カラム | 説明 |
|---|---|
| `id` | **integer autoincrement PK**（他テーブルはUUID text PKだが、カーソルページネーションの順序保証を優先した意図的な規約差異） |
| `conversationId` | FK → `coach_conversations.id`, `onDelete: cascade` |
| `role` | `"user"` \| `"assistant"` |
| `content` | メッセージ本文 |
| `proposal` | nullable JSON。提案(マイルストーン+子TODO)と各項目の採用状態を保持 |
| `createdAt` | |

`proposal` の構造:
```ts
type PlanProposalPayload = {
  milestone: { title: string; adopted: boolean; createdMilestoneId?: string } | null;
  todos: { title: string; taskType: "daily" | "once"; adopted: boolean; createdTodoId?: string }[];
};
```
`milestone` がnullの場合は「マイルストーンを伴わない単発TODO提案」を意味し、`todos` は採用順序制約を受けない。`milestone` が値を持つ場合、その `todos` は新規マイルストーンが採用された後でなければ採用できない(Service層で強制)。

### 正規化・将来拡張

`coach_conversations`/`coach_messages` は共に第3正規形(3NF)を満たす。全カラムが主キーに完全従属し、推移従属関係を持つカラムは存在しない。スナップショット列は非正規化ではなく、削除後に再現不可能な事実の保持である。

`coach_messages` は会話の生ログ(短期記憶)として設計し、`coach_messages.id` を安定した参照キーとして使えるようにしている。要約・埋め込み等の長期記憶層・ベクターDB移行は今回は実装しないが、将来必要になった際は `coach_messages.id` を外部キーとする新規テーブル(例: `coach_memory_embeddings`)を追加するだけで済み、既存テーブルの変更は不要という拡張余地を残している。

## APIエンドポイント

| Method | Path | 用途 |
|---|---|---|
| POST | `/coach/conversations` | 会話開始/取得 (`{ goalId }`) |
| GET | `/coach/conversations/:id/messages?cursor=&limit=` | 履歴取得(カーソルページネーション) |
| POST | `/coach/conversations/:id/messages` | メッセージ送信 (`{ content }`) |
| POST | `/coach/messages/:id/adopt-plan-item` | 提案項目の採用 (`{ target: "milestone" }` または `{ target: "todo", todoIndex }`) |

カーソルページネーションは `id` の降順で `limit + 1` 件取得してhasMoreを判定し、`id` が時系列と完全一致するため正確な順序を保証する。

レート制限: userロールメッセージ数が24時間で50件を超えると429。

## プロンプト設計

ペルソナ `calmMentor`: 丁寧語・淡々とした事実提示。挑発的・煽情的な言い回しは使わない。「愛のムチ」とは感情的に厳しくすることではなく、実データ(進捗のズレ・期限超過・繰り返される言い訳など)を評価や決めつけを加えず事実として提示し、本人の成長のために率直に伝えることを指す。

`generateObject` の出力スキーマ:
```ts
{
  reply: string;
  planProposal: {
    milestoneTitle: string | null;
    todos: { title: string; taskType: "daily" | "once" }[];
  } | null;
}
```

`planProposal` は、ユーザーの現状・制約・過去の試行・期限の現実味を対話で十分に引き出せたと判断した場合のみ値を持つ。判断基準はプロンプト内の指示に委ね、ターン数などのハードガードはコード側に設けない。

目標(goal)自体への改善提案(タイトル・期限の見直し)、既存マイルストーンへの改善コメントは、`reply` の自然文の中でのみ行う。構造化データ・採用ボタンは持たせない。

## 採用フロー

1. `target: "milestone"` — `proposal.milestone` が未採用なら `MilestoneService.createOne` でマイルストーンを作成し、`adopted: true` + `createdMilestoneId` を書き込む
2. `target: "todo", todoIndex` — 対象TODOが `proposal.milestone` に紐づく場合、そのマイルストーンが未採用だと `MilestoneNotAdoptedYetError` で拒否する。マイルストーン採用後(または `milestone: null` の単発TODO)であれば、既存 `TodoService.create` を呼び出して作成し、`adopted: true` + `createdTodoId` を書き込む

同一項目への二重採用は `PlanItemAlreadyAdoptedError` で防止する。
