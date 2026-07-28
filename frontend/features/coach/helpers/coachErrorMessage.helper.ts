import { ApiClientError } from "@/lib/swr/apiClient";

export type CoachErrorKind =
	| "validation"
	| "conversationNotFound"
	| "planItemNotFound"
	| "alreadyAdopted"
	| "milestoneNotAdoptedYet"
	| "rateLimit"
	| "notConfigured"
	| "modelUnavailable"
	| "network"
	| "unknown";

export type CoachErrorInfo = {
	kind: CoachErrorKind;
	message: string;
};

const STATUS_MESSAGES: Record<number, CoachErrorInfo> = {
	400: {
		kind: "validation",
		message: "入力内容に誤りがあります。メッセージの内容を確認してください。",
	},
	404: {
		kind: "conversationNotFound",
		message: "会話または提案が見つかりませんでした。ページを更新して再度お試しください。",
	},
	409: {
		kind: "alreadyAdopted",
		message: "既に採用済み、または主要な成果（Key Results）を先に採用する必要があります。",
	},
	429: {
		kind: "rateLimit",
		message:
			"AIコーチとの会話回数が上限（24時間で50件）に達しました。時間を置いて再度お試しください。",
	},
	502: {
		kind: "modelUnavailable",
		message: "AIコーチの応答生成に失敗しました。時間を置いて再度お試しください。",
	},
	503: {
		kind: "notConfigured",
		message: "現在AIコーチ機能はご利用いただけません。しばらくしてから再度お試しください。",
	},
};

// apiClientがスローしたApiClientError（またはその他のError）をユーザー向けメッセージ+種別に変換する
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
