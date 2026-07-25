---
name: self-review
description: Goal Coach AI のPR/ブランチ用セルフレビューチェックリスト。自分の変更をレビューする前に読み込む。バックエンド（パフォーマンス・セキュリティ・DB第3正規化・テスト）とフロントエンド（Context+Props構成・不要なuseEffect・helper切り出し+テスト・責務分離）をCLAUDE.mdに沿って確認する。
---

# セルフレビュー — Goal Coach AI

対象ブランチ/差分を以下のチェックリストで確認する。特に指定がなければ `main` を基準にする:
`git diff main...<branch> --stat` で変更ファイルを把握し、実ファイルを読む。指摘は **Blocker / Should-fix / Nit** に分類し、`file:line` を明記する。

## バックエンド

### クリーンアーキテクチャ / 凝集
- data(定数)とmethodを散らさない — 定数はそれを使うクラスに `static readonly` で同居させる（module scopeに浮かせない）
- **他featureのサービス層(`features/*/services`)を別featureから呼ばない** — feature間結合のアンチパターン。共有は `common/repositories`（共通データアクセス層）を使う
- 他ドメインの内部ロジック（採番・バリデーション等）をコンシューマ側で再実装しない。ドメイン固有ルールは所属する層（サービス or 共有リポジトリ）に置く
- コントローラ(route)は入出力の変換のみ。既定値・クランプ・ページング等の方針はサービスが持つ

### パフォーマンス
- N+1クエリ: ループ内で1行ずつDB呼び出ししていないか → batch/JOINにまとめる
- 複数書き込みは `db.batch()` でアトミックにまとめているか（プロジェクトメモリの方針）
- 上限のないリスト取得 — ページネーション/limitがあるか、絞り込み/ソート対象カラムにindexがあるか
- 手元にあるデータの再取得や、並列化できるはずの直列awaitがないか

### セキュリティ
- 認証/認可: 全ルートで呼び出し元を検証し、行を認証ユーザーにスコープしているか（IDOR — ユーザーAがユーザーBの会話を読めないか）
- 入力バリデーションを境界（`validators.ts`, zod）でDB/LLMに渡す前に行っているか
- ログにシークレット/PIIを出していないか、env参照は型付き `env.ts` 経由か
- LLMプロンプトインジェクション: ユーザー文字列を「命令」ではなく「データ」として扱っているか、出力は境界付けされているか
- SQLはクエリビルダ/パラメータ化されているか — 文字列連結でないか

### DB設計 — 第3正規化（3NF）
- 1NF: カラムはアトミックか、繰り返しグループがないか（JSONブロブは正当か、関係データを隠していないか）
- 2NF: 非キー列が主キー全体に従属しているか（複合PKに注意）
- 3NF: 推移的従属がないか — 非キー列が別の非キー列から導出できるのは臭い
- 意図的な非正規化（例: goalスナップショット）は意図的なものか、事故でないかを確認
- FK・`NOT NULL`・ユニーク制約・cascade/restrictの挙動が意図と一致しているか

### テスト
- すべての `*.helper.ts` に対応する `*.helper.test.ts` があるか（CLAUDE.mdルール）
- 分岐/エッジケース（空・エラー経路・境界値）をカバーしているか、ハッピーパスだけでないか
- 新しいエラー型とバリデータがテストで実行されているか
- サービス層のロジック（採用・状態遷移）にカバレッジがあるか

## フロントエンド

### ディレクトリ構成（`features/{name}/`）
- ファイルが正しいバケツにあるか: `components/ contexts/ hooks/ helpers/ config/ types/`
- 命名: コンポーネント/モジュールはcamelCase、helperは `xxx.helper.ts` + `.helper.test.ts`、configは `xxxConfig.ts`

### Context + Props 構成（CLAUDE.md 中核ルール）
- **hooksはcontexts内でのみ呼ぶ** — コンポーネントがデータ/SWRフックを直接呼んでいないか
- **page.tsxでProviderを配置** — ツリーをラップしているか
- **propsバケツリレー** — contextの値はpropsで子に流し、コンポーネントはpure（props依存のみ・副作用なし）か
- コンポーネントが自前でhookを呼んだり自前フェッチしていないか

### useEffect衛生
- (a) renderで計算できる派生state、(b) props→stateの同期、(c) イベントハンドラでやるべき処理 を行う `useEffect` がないか
- 残すeffectはdepsが正しくcleanupがあるか

### helper切り出しと責務分離
- 非自明/純粋なロジックは（テスト可能な）`helpers/` にあるか、コンポーネントやcontextにインラインで残っていないか
- 各helperは単一責務か（mapping ≠ prompt構築 ≠ snapshot取得）
- 各レイヤーが1つの責務を持つか: component=表示、context=状態/配線、hook=フェッチ、helper=ロジック

## 全般（CLAUDE.md）
- **マジックナンバー禁止** — リテラルは命名付き定数へ。backend=クラスの `static readonly`（または適切なmodule const）、frontend=`config/xxxConfig.ts` に切り出して複数箇所から参照。HTTPステータス等の慣習値は例外
- `const` のみ — `let` を使わない（3分岐の条件は三項演算子か関数抽出で `const` に収める）
- `pnpm lint`（Biome）を通るか — リポジトリルートではなくパッケージ内から実行する（プロジェクトメモリ）
- 色はハードコードせずCSS変数のデザイントークンを使う

## 出力フォーマット
各指摘: 重要度、`path:line`、何が問題か、具体的な修正案。最後に短い判定（ship / fix-then-ship / rework）と、レビューできなかった範囲の補足を付ける。
