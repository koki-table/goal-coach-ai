import type { PlanFeature } from "../types";

// 課金・利用制限の定数。マジックナンバーを散らさず一箇所に集約する。
// free tierの1日あたり上限(FREE_DAILY_DECIDED_LIMIT)はここにハードコードせず、
// GET /billing/statusのfreeDailyDecidedLimitフィールドを常に使う
// (バックエンド定数とフロント表示の値がズレることを防ぐ)
export const MONTHLY_PRICE_JPY = 980;
export const YEARLY_PRICE_JPY = 7800;

// LP・billingページ両方が参照するプラン機能一覧。表記を変える時はここ1箇所を直す。
export const PLAN_FEATURES: { free: PlanFeature[]; pro: PlanFeature[] } = {
	free: [{ label: "目標・TODO管理" }, { label: "ペンタ君との対話 1日3回まで" }],
	pro: [
		{ label: "対話・提案 無制限" },
		{ label: "高性能なAIモデル" },
		{ label: "自律エージェント", comingSoon: true },
		{ label: "週次レポート", comingSoon: true },
	],
};
