// coach機能の定数。マジックナンバーを散らさず一箇所に集約する。

// メッセージ入力の長さ制約（バックエンドの coachMessageCreateSchema と一致させる）
export const MESSAGE_MIN_LENGTH = 1;
export const MESSAGE_MAX_LENGTH = 1000;

// 最下部からこのpx以内にいる場合のみ、新規メッセージ受信時に自動スクロールする
export const AUTO_SCROLL_THRESHOLD_PX = 100;

// このpx以下をモバイル表示として扱う
export const MOBILE_BREAKPOINT_PX = 767;
