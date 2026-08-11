import type { CtaTarget } from "../types";

/**
 * ログイン状態に応じてCTAのラベルと行き先を切り替える
 * @param isSignedIn - ログイン済みかどうか
 * @returns 未ログイン時は登録導線、ログイン済みならアプリへのショートカット
 */
export function resolvePrimaryCtaTarget(isSignedIn: boolean): CtaTarget {
	return isSignedIn
		? { label: "アプリを開く", href: "/goals" }
		: { label: "無料で始める", href: "/sign-up" };
}
