"use client";

import { useEffect, useState } from "react";

/**
 * メディアクエリの一致状態を返すSSRセーフなフック。
 * サーバー描画時とハイドレーション前は false を返し、
 * マウント後に matchMedia を購読して実際の状態へ更新する。
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		const mql = window.matchMedia(query);
		setMatches(mql.matches);

		const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [query]);

	return matches;
}
