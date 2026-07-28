import { MS_PER_DAY } from "../config/goalsConfig";

/**
 * "YYYY-MM-DD" をローカル日付0時として解釈する。
 * new Date(str) はUTC0時としてパースされタイムゾーンによって日付がずれるため、
 * 年月日を分解してローカルコンストラクタに渡す。
 */
function parseDateOnly(dateStr: string): Date {
	const [year, month, day] = dateStr.split("-").map(Number);
	return new Date(year, month - 1, day);
}

function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * 期限までの残り日数を返す（当日は0、過去は負数）。
 * 時刻を無視して日付のみで比較するため、当日中は期限切れにならない。
 */
export function computeDaysRemaining(deadline: string, now: Date): number {
	const deadlineDate = startOfLocalDay(parseDateOnly(deadline));
	const today = startOfLocalDay(now);
	return Math.round((deadlineDate.getTime() - today.getTime()) / MS_PER_DAY);
}
