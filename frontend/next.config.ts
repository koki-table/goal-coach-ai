import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// ダッシュボードは一旦非表示。ルート(/)は目標管理へ一時リダイレクトする。
	// 復帰時はこの redirects を外すだけでよい（ダッシュボードのページ自体は変更しない）。
	async redirects() {
		return [{ source: "/", destination: "/goals", permanent: false }];
	},
};

export default nextConfig;
