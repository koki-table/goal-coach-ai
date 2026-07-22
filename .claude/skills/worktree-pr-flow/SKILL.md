---
name: worktree-pr-flow
description: Use this skill when the user asks to implement a feature "using a worktree" and "create a PR" (e.g. "git worktreeを使ってPR作成まで対応して" / "worktreeでブランチ切ってPRまで進めて"). Covers the full flow from branching off, through implementation and verification, to PR creation and worktree cleanup, plus this repo's git/gh/lint conventions.
---

# Worktree → 実装 → PR → 削除 ワークフロー

## 適用条件
ユーザーが「git worktreeを使って」「worktreeでブランチ切ってPRまで」のように、worktreeでの作業とPR作成をセットで依頼したとき。

## 手順

### 1. 着手前にplanの品質を検証する
実装に入る前に、plan（設計）が以下の観点で問題ないか確認する。曖昧な点はユーザーに確認してから進める。
- **保守性**: 既存のディレクトリ構成・命名規則・repository/serviceパターンを踏襲しているか
- **パフォーマンス**: N+1クエリ、不要な全件取得、インデックス未使用のクエリがないか
- **可読性**: 責務が1ファイル1関心事に分かれているか、既存のhelper/mapperパターンと一貫しているか

### 2. worktreeを作成する
どのブランチから切るか（`main` か既存のfeatureブランチか）をユーザーに確認する。既存featureブランチから切る場合、migration番号などの衝突がないか確認する。

```bash
git worktree add ../<repo>-<short-name> -b feature/#<issue>-<slug> <base-branch>
```

### 3. worktree内で実装する
以降のコマンドはworktreeのディレクトリで実行する。

### 4. 検証する
このリポジトリでの検証コマンド:
- `cd backend && pnpm exec tsc --noEmit`（型チェック）
- `cd backend && pnpm test:run`（vitest）
- `cd backend && pnpm lint`（**biomeはパッケージ内から実行する**。rootにbiome.jsonが無く、root実行だと80桁で再整形されてしまう）

### 5. commit → push → PR作成
- `let` は使わない（このリポジトリの規約。値が変わる場合は三項演算子や関数抽出で`const`に収める）
- helperには必ずペアテスト（`xxx.helper.ts` + `xxx.helper.test.ts`）を書く
- gh操作は `koki-table` トークンを使う（activeアカウントが別だと404になるため）:
  ```bash
  GH_TOKEN=$(gh auth token -u koki-table) gh pr create --base <base-branch> ...
  ```
- 既存featureブランチから切った場合、PRの`--base`もそのブランチにする（スタックPR）。ベースの元PRがマージされたら `gh pr edit --base main` で付け替える

### 6. worktreeを削除する
PR作成後、未コミット変更が無いことを確認してから削除する。

```bash
git worktree remove ../<repo>-<short-name>
```

## 注意点
- curlは使わない。HTTP疎通確認は `node -e "fetch(...)"` を使う
- 破壊的操作（`git worktree remove` 含む）の前に `git status --short` で未コミット変更が無いことを必ず確認する
