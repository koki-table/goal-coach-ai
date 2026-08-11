import { ApiClientError } from "@/lib/swr/apiClient";

export type CoachErrorKind =
	| "validation"
	| "conversationNotFound"
	| "planItemNotFound"
	| "alreadyAdopted"
	| "milestoneNotAdoptedYet"
	| "goalLimitExceeded"
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
		message: "AIコーチとの会話回数が上限に達しました。時間を置いて再度お試しください。",
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

function extractReason(info: unknown): string | undefined {
	return info && typeof info === "object" && "reason" in info
		? String((info as { reason: unknown }).reason)
		: undefined;
}

// apiClientがスローしたApiClientError（またはその他のError）をユーザー向けメッセージ+種別に変換する
export function mapCoachError(error: unknown): CoachErrorInfo {
	if (error instanceof ApiClientError) {
		// reasonフィールドを持つ409は、汎用の「既に採用済み」文言より先に専用の理由を判定する
		if (error.status === 409 && extractReason(error.info) === "goalLimitExceeded") {
			return {
				kind: "goalLimitExceeded",
				message:
					"目標は同時に2件までしか設定できません。既存の目標を完了するか削除してから、新しい相談を始めてください。",
			};
		}

		// free tierの1日3回制限に達した場合の専用文言。Proは実質ブロックされないため
		// このreasonは常にfree tierユーザーにのみ発生する
		if (error.status === 429 && extractReason(error.info) === "freeTierDailyLimit") {
			return {
				kind: "rateLimit",
				message:
					"本日の相談回数が上限（3回）に達しました。Proプランなら実質無制限でご利用いただけます。",
			};
		}

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
