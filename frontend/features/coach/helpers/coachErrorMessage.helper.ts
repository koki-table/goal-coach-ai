import { ApiClientError } from "@/lib/swr/apiClient";

export type CoachErrorKind =
	| "validation"
	| "goalNotFound"
	| "rateLimit"
	| "notConfigured"
	| "network"
	| "unknown";

export type CoachErrorInfo = {
	kind: CoachErrorKind;
	message: string;
};

const STATUS_MESSAGES: Record<number, CoachErrorInfo> = {
	400: {
		kind: "validation",
		message: "入力内容に誤りがあります。進捗率やメモの内容を確認してください。",
	},
	404: {
		kind: "goalNotFound",
		message: "選択した目標が見つかりませんでした。目標一覧を更新して再度お試しください。",
	},
	429: {
		kind: "rateLimit",
		message:
			"AIコーチの評価回数が上限（24時間で20回）に達しました。時間を置いて再度お試しください。",
	},
	503: {
		kind: "notConfigured",
		message: "現在AIコーチ機能はご利用いただけません。しばらくしてから再度お試しください。",
	},
};

/**
 * apiClient がスローした ApiClientError（またはその他のError）を
 * ユーザー向けメッセージ + 種別に変換する
 */
export function mapCoachError(error: unknown): CoachErrorInfo {
	if (error instanceof ApiClientError) {
		const known = STATUS_MESSAGES[error.status];
		if (known) return known;
		if (error.status >= 500) {
			return {
				kind: "unknown",
				message: "サーバーエラーが発生しました。時間を置いて再度お試しください。",
			};
		}
	}
	return {
		kind: "network",
		message: "通信エラーが発生しました。ネットワーク接続を確認して再度お試しください。",
	};
}
