export type SubscriptionTier = "free" | "pro";
export type SubscriptionStatus = "active" | "past_due" | "canceled";

// バックエンドGET /billing/statusのレスポンス型
export type BillingStatus = {
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	currentPeriodEnd?: string;
	decidedMessagesUsedToday: number;
};

export type BillingInterval = "monthly" | "yearly";
