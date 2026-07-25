---
paths:
  - "backend/**"
---

# バックエンド実装ルール（Goal Coach AI）

実装中は以下を常に満たすこと。詳細な原則は `CLAUDE.md` の「バックエンド設計」も参照。

## クリーンアーキテクチャ / 凝集
- レイヤ責務を守る: `route`=入出力変換のみ / `service`=方針・オーケストレーション / `common/repositories`=共有データアクセス。
- **他featureのサービス層（`features/*/services`）を別featureから呼ばない**。feature間結合のアンチパターン。
  - 例: coachが milestone/todo を作る時は `MilestoneService`/`TodoService` ではなく共有 `MilestoneRepository`/`TodoRepository` を使う。
- 他ドメインの固有ルール（sortOrder採番・所有権検証・バリデーション）をコンシューマ側で再実装しない。所属層（サービス or 共有リポジトリ）に置く。
- 既定値・クランプ・ページング等の方針は `service` が持つ。`route` に数値方針を書かない。
- 定数はそれを使うクラスに `static readonly` で同居させる（module scopeに散らさない）。

## パフォーマンス
- N+1回避: ループ内の1行ずつのDB呼び出しは batch/JOIN にまとめる。
- 複数書き込みの原子性は `db.batch()`（D1は `transaction()` 非対応）。片方だけ成功する状態を作らない。
- リスト取得は limit/ページネーションを持ち、絞り込み・ソート対象カラムに index を張る。
- 並列化できる独立awaitは `Promise.all` でまとめる。手元にあるデータを再取得しない。

## セキュリティ
- 全ルートで認証ユーザーを確認し、行を認証ユーザーにスコープする（IDOR禁止: `findByIdAndUserId` 等）。
- 入力は境界（`validators.ts` / zod）でDB・LLMに渡す前に検証する。
- LLMにはユーザー文字列を「データ」として渡す（命令として扱わない）。出力はzod等で境界付け。
- SQLはdrizzleクエリビルダ/パラメータ化。文字列連結でクエリを組まない。
- ログにシークレット/PIIを出さない。env参照は型付き `env.ts` 経由。

## DB設計
- 第3正規化を基本とする。非正規化（スナップショット等）は意図をコメントで明示する。
- FK・`NOT NULL`・ユニーク制約・cascade/restrict を意図通りに設定する（不変条件はDBで保証）。

## テスト
- `*.helper.ts` は必ず `*.helper.test.ts` とペア。
- サービス層の非自明なロジック（採用・状態遷移・エラー分岐）にテストを書く。ハッピーパスだけにしない。
- 新しいエラー型・バリデータをテストで実行する。

## 定数
- マジックナンバーはクラスの `static readonly`（または適切なmodule const）に。HTTPステータス等の慣習値は例外。
