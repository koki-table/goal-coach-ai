# Goal Coach AI

AI軍曹があなたの目標達成を支援するアプリケーション。

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Lint/Format**: Biome
- **Test**: Vitest + @testing-library/react
- **Package Manager**: pnpm (workspaces)

## ディレクトリ構成

```
goal-coach-ai/
├── frontend/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # ルートレイアウト
│   │   ├── page.tsx          # ダッシュボード
│   │   ├── goals/            # 目標管理
│   │   ├── todos/            # ToDo
│   │   └── coach/            # AI軍曹
│   ├── components/
│   │   ├── layout/           # AppShell, Header, Sidebar
│   │   └── ui/              # shadcn/ui コンポーネント
│   ├── features/
│   │   ├── goals/           # 目標管理機能
│   │   ├── todos/           # ToDo機能
│   │   └── coach/           # AI軍曹機能
│   ├── hooks/               # 共有カスタムフック
│   ├── lib/                 # ユーティリティ・定数
│   └── types/               # 共有型定義
├── backend/                 # (将来実装)
├── CLAUDE.md               # アーキテクチャルール
└── pnpm-workspace.yaml     # モノレポ定義
```

## Getting Started

```bash
# 依存インストール
pnpm install

# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# リント
pnpm lint

# テスト
pnpm test:run
```

## アーキテクチャ

詳細は [CLAUDE.md](./CLAUDE.md) を参照。
