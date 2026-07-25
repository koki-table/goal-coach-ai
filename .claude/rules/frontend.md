---
paths:
  - "frontend/**"
---

# フロントエンド実装ルール（Goal Coach AI）

実装中は以下を常に満たすこと。詳細は `CLAUDE.md` の「アーキテクチャ: Context + Props Drilling」も参照。

## Context + Props 構成
- データフロー: `page.tsx`(Provider設置) → `Context`(hooks呼び出し・状態管理) → `Component`(propsで受け取り表示のみ)。
- **hooksはcontexts内でのみ呼ぶ** — コンポーネントからデータ/SWRフックを直接呼ばない。
- **Providerはpage.tsxで配置** し、ツリーをラップする。
- **propsバケツリレー** — contextの値はpropsで子に渡す。子は `useContext` に直接触らない。
- **コンポーネントはpure** — propsのみ依存・副作用なし（ローカルなUI stateは可）。

## useEffect衛生
- 次のuseEffectは書かない: (a) renderで計算できる派生state、(b) props→stateの同期、(c) イベントハンドラでやるべき処理。
- 残すeffect（データフェッチ起動・購読・DOM同期等）はdepsを正確にし、必要なcleanupを付ける。

## helper切り出しとテスト
- 非自明/純粋なロジックは `helpers/xxx.helper.ts` に切り出し、`xxx.helper.test.ts` をペアで書く。
- コンポーネント/contextにロジックをインラインで抱えさせない。各helperは単一責務。

## ディレクトリ / 命名
- `features/{name}/` の適切なバケツに置く: `components/ contexts/ hooks/ helpers/ config/ types/`。
- モジュールはcamelCase、helperは `xxx.helper.ts` + `.helper.test.ts`、configは `xxxConfig.ts`。

## 定数
- マジックナンバーは `features/{name}/config/xxxConfig.ts` に集約し、複数箇所から参照する（同じ値を複数ファイルに直書きしない）。

## スタイリング
- 色・サイズはデザイントークン（`app/globals.css` のCSS変数 / semanticクラス）を使う。色をハードコードしない。
