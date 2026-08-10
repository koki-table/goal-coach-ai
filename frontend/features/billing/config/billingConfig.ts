// 課金・利用制限の定数。マジックナンバーを散らさず一箇所に集約する。
// free tierの1日あたり上限(FREE_DAILY_DECIDED_LIMIT)はここにハードコードせず、
// GET /billing/statusのfreeDailyDecidedLimitフィールドを常に使う
// (バックエンド定数とフロント表示の値がズレることを防ぐ)
export const MONTHLY_PRICE_JPY = 980;
export const YEARLY_PRICE_JPY = 7800;
