// UTC基準のYYYY-MM-DD文字列。coachDailyUsageの日次カウンタキー、プロンプトの
// 「本日」表示、期限判定など複数箇所で同じ形式の「今日」が必要なため共有する。
export function todayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}
