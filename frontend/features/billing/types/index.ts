export type SubscriptionTier = "free" | "pro";
export type SubscriptionStatus = "active" | "past_due" | "canceled";
export type BillingInterval = "monthly" | "yearly";
export type PlanFeature = { label: string; comingSoon?: boolean };

// バックエンドGET /billing/statusのレスポンス型。freeDailyDecidedLimitはサーバー側の
// 定数(CoachChatGate)をそのまま返す値で、フロント側で同じ値をハードコードしない
// (バックエンド定数の変更がフロント表示とズレることを防ぐ)。intervalはstripePriceIdから
// バックエンドが判定した契約区分で、free tierや未知のpriceIdの場合はundefined
export type BillingStatus = {
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	currentPeriodEnd?: string;
	// trueの間はstatus="active"のままcurrentPeriodEndまでpro機能を使い続けられ、
	// 期間終了後は自動でtier="free"/status="canceled"に遷移する
	cancelAtPeriodEnd: boolean;
	decidedMessagesUsedToday: number;
	freeDailyDecidedLimit: number;
	interval?: BillingInterval;
};
