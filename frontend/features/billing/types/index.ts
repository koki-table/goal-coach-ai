export type SubscriptionTier = "free" | "pro";
export type SubscriptionStatus = "active" | "past_due" | "canceled";

// バックエンドGET /billing/statusのレスポンス型。freeDailyDecidedLimitはサーバー側の
// 定数(CoachChatGate)をそのまま返す値で、フロント側で同じ値をハードコードしない
// (バックエンド定数の変更がフロント表示とズレることを防ぐ)
export type BillingStatus = {
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	currentPeriodEnd?: string;
	decidedMessagesUsedToday: number;
	freeDailyDecidedLimit: number;
};

export type BillingInterval = "monthly" | "yearly";
