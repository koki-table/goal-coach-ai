// 定量Key Results（主要な成果）の既定値・単位候補。
// マジックナンバーを各コンポーネントに直書きせず、ここに集約する。

// 新規KRの既定目標値・開始値・現在値。
// 既定は「0〜100%」スケール（目標値100・単位%）。実数目標(900点など)はフォームで上書きする。
export const DEFAULT_TARGET_VALUE = 100;
export const DEFAULT_START_VALUE = 0;
export const DEFAULT_CURRENT_VALUE = 0;
export const DEFAULT_UNIT = "%";

// 進捗率の下限・上限（%）
export const PROGRESS_MIN_PERCENT = 0;
export const PROGRESS_MAX_PERCENT = 100;

// 単位のクイック入力候補
export const UNIT_SUGGESTIONS = ["点", "件", "%", "回", "冊", "分", "時間", "kg", "円"] as const;
