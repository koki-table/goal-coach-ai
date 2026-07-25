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

## バックエンド設計（クリーンアーキテクチャ）
- レイヤ責務: `route`（入出力変換のみ）→ `service`（方針・オーケストレーション）→ `common/repositories`（共有データアクセス）
- **他featureのサービス層（`features/*/services`）を別featureから呼ばない** — feature間結合のアンチパターン。越境が必要なデータ操作は共有の `common/repositories` を使う
- ドメイン固有ルール（採番・所有権検証・バリデーション等）はコンシューマ側で再実装しない。所属する層に置く
- 既定値・クランプ・ページング等の方針は `service` が持つ。`route` に数値方針を書かない
- data（定数）はそれを使うクラスに `static readonly` で同居させる（module scopeに散らさない）
- 複数書き込みの原子性は D1 の `db.batch()`（`transaction()` 非対応）

## テスト
- テストフレームワーク: Vitest
- helpers は必ずテストを書く（`xxx.helper.test.ts`）
- サービス層の非自明なロジック（採用・状態遷移・分岐）にもテストを書く
- コンポーネントテストは @testing-library/react

## スタイリング
- Tailwind CSS v4 + shadcn/ui
- デザイントークンは `app/globals.css` のCSS変数で管理
- デフォルトライトモード（Zennデザインシステム準拠、読みやすさ重視）
- Clerk UIは `@clerk/ui` の shadcn テーマ（`ClerkProvider` の `appearance={{ theme: shadcn }}`）でSemanticトークンに追従

## タイポグラフィ（Zenn準拠）
- フォント: システムフォントスタック（next/font 不使用）
  - 本文/UI: `-apple-system, "system-ui", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif`
  - コード: `SFMono-Regular, Consolas, Menlo, monospace`
- 本文: 16px / weight 400 / line-height 1.8
- 見出し: weight 700 / line-height 1.5

## 形状・エレベーション（Zenn準拠）
- 角丸: 8px（ボタン・入力 = `rounded-lg`）/ 12px（カード = `rounded-xl`）
- カードは `border-border` のボーダー、ベースシャドウなし
- シャドウ3段階: `shadow-sm`(hover) / `shadow-md`(dropdown) / `shadow-lg`(modal)

## カラートークン設計（2層構造）

参考: Zennデザインシステム（値）+ デジタル庁デザインシステム（2層構造）

### Layer 1: Primitive Colors（不変の色パレット）
- 色相ごとに13段階: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200
- 50=最淡、1200=最濃。500-600が標準使用域
- 定義する色相: Blue, Light Blue, Cyan, Green, Yellow, Orange, Red, Gray
- 変数名: `--{color}-{step}` (例: `--light-blue-500`)
- Primitiveは絶対に変更しない（全テーマ共通）
- Zennアンカー値（このベースラインを維持すること）:
  - `--light-blue-500` = #3ea8ff (Zenn Blue) / `--light-blue-600` = #0f83fd
  - `--green-500` = #10b981 / `--orange-500` = #f59e0b / `--red-500` = #f43f5e
  - `--gray-100` = #f1f5f9 (Surface) / `--gray-200` = #d6e3ed (Border)
  - Grayは青みがかったクールグレー（slate系）
- アルファプリミティブ（テキスト用、テーマ非依存）:
  - `--black-a82` / `--black-a55` / `--black-a36`（ライトの本文/補助/無効）
  - `--white-a90` / `--white-a60` / `--white-a38`（ダークの本文/補助/無効）

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
- Primary: Light Blue系（Zenn Blue #3ea8ff）
- ステータス: Success=Green-500, Error=Red-500, Warning=Orange-500
- テキスト: `--black-a82`（ライト）/ `--white-a90`（ダーク）— アルファプリミティブ参照
- 背景: White（ライト）/ Gray-900（ダーク）、面: Gray-100
- ボーダー: Gray-200（ライト）/ Gray-700（ダーク）
- Warningのforegroundはライトでは `--black-a82`（白字はコントラスト不足のため）

## パッケージマネージャー
- pnpm (workspaces)
- モノレポ構成: frontend/ + backend/

## Lint/Format
- Biome を使用（ESLintではない）
- `pnpm lint` → `biome check .`
- `pnpm format` → `biome format --write .`

## コーディング規約
- `let` は使わない — 変数は `const` で宣言する。条件分岐で値が変わる場合は三項演算子や関数抽出で `const` に収める
- **マジックナンバー禁止** — リテラルは命名付き定数へ。backend=クラスの `static readonly`（または適切なmodule const）、frontend=`config/xxxConfig.ts` に切り出して複数箇所から参照。HTTPステータス等の慣習値は例外
- **useEffect衛生** — 次のuseEffectは書かない: (a) renderで計算できる派生state、(b) props→stateの同期、(c) イベントハンドラでやるべき処理。残すeffectはdepsを正確に・cleanupを付ける
