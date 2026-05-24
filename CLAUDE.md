# CLAUDE.md - Goal Coach AI アーキテクチャルール

## ファイル命名規約
- コンポーネント・モジュール: camelCase (`appShell.tsx`, `goalsContext.tsx`)
- helper: `xxxYyy.helper.ts` + `xxxYyy.helper.test.ts`（常にペア）
- config: `xxxConfig.ts`（例: `goalsConfig.ts`）
- shadcn/ui components: kebab-case維持（自動生成のため）

## アーキテクチャ: Context + Props Drilling

### データフロー
```
page.tsx (Provider設置)
  → Context (hooks呼び出し・状態管理)
    → Component (propsでデータ受け取り・表示のみ)
```

### ルール
1. **hooksはcontexts内でのみ呼ぶ** — コンポーネントから直接hookを呼ばない
2. **pageでProviderを配置** — page.tsxがContextProviderをラップする
3. **propsバケツリレー** — contextの値はpropsで子コンポーネントに渡す
4. **コンポーネントはpure** — propsのみに依存、副作用なし

### feature構成
```
features/{name}/
├── components/    # UIコンポーネント（propsのみ依存）
├── contexts/      # Context定義 + Provider（hookを内部で使用）
├── hooks/         # SWR/データフェッチフック
├── helpers/       # 純粋なロジック関数 + テスト
├── config/        # 定数・設定値
└── types/         # 型定義
```

## テスト
- テストフレームワーク: Vitest
- helpers は必ずテストを書く（`xxx.helper.test.ts`）
- コンポーネントテストは @testing-library/react

## スタイリング
- Tailwind CSS v4 + shadcn/ui
- デザイントークンは `app/globals.css` のCSS変数で管理
- デフォルトライトモード（水色基調、優しい雰囲気）

## カラートークン設計（2層構造）

参考: デジタル庁デザインシステム参考

### Layer 1: Primitive Colors（不変の色パレット）
- 色相ごとに13段階: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200
- 50=最淡、1200=最濃。500-600が標準使用域
- 定義する色相: Blue, Light Blue, Cyan, Green, Yellow, Orange, Red, Gray
- 変数名: `--{color}-{step}` (例: `--light-blue-500`)
- Primitiveは絶対に変更しない（全テーマ共通）

### Layer 2: Semantic Colors（用途別マッピング）
- shadcn/ui互換の変数名 (`--primary`, `--background`, etc.)
- 値は必ずPrimitive変数を参照: `var(--light-blue-500)`
- テーマ切替 = Semanticの参照先を変えるだけ
- ライト/ダーク対応: `:root` と `.dark` で分離

### 命名規則
- Primitive: `--{hue}-{step}` → `--light-blue-500`, `--red-600`
- Semantic: `--{role}` → `--primary`, `--destructive`, `--success`
- 新しいSemanticを追加する時は必ずPrimitiveを参照すること

### Goal Coach AI のカラー方針
- Primary: Light Blue系（優しい水色）
- ステータス: Success=Green-600, Error=Red-600, Warning=Orange-600
- 背景: White（ライト）/ Gray-900（ダーク）
- ボーダー: Gray-200（ライト）/ Gray-700（ダーク）

## パッケージマネージャー
- pnpm (workspaces)
- モノレポ構成: frontend/ + backend/

## Lint/Format
- Biome を使用（ESLintではない）
- `pnpm lint` → `biome check .`
- `pnpm format` → `biome format --write .`
