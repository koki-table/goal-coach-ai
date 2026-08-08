// coach機能の定数。マジックナンバーを散らさず一箇所に集約する。

// メッセージ入力の長さ制約（バックエンドの coachMessageCreateSchema と一致させる）
export const MESSAGE_MIN_LENGTH = 1;
export const MESSAGE_MAX_LENGTH = 1000;

// 最下部からこのpx以内にいる場合のみ、新規メッセージ受信時に自動スクロールする
export const AUTO_SCROLL_THRESHOLD_PX = 100;

// このpx以下をモバイル表示として扱う
export const MOBILE_BREAKPOINT_PX = 767;

// 考え中インジケータのドットごとのアニメーション開始遅延
export const TYPING_INDICATOR_DOT_DELAYS_MS = [0, 150, 300] as const;

// 探索スレッド(目標未確定)の固定表示ラベル。バックエンドのEXPLORATION_THREAD_LABELと一致させる
export const EXPLORATION_THREAD_LABEL = "目標を決める相談";

// OKRの考え方に基づく目標(Objective)数の上限。goals featureのMAX_ACTIVE_GOALSと同じ値を
// coach feature独自に持つ(feature間でconfigを直接importしない方針のため)
export const MAX_ACTIVE_GOALS = 2;
