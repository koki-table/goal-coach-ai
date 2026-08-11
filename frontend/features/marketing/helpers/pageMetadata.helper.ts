import type { Metadata } from "next";

const OG_IMAGE_PATH = "/penguin-talk.png";

/**
 * LP系ページ共通のOGP/Twitter Cardを組み立てる
 * @param title - ページタイトル
 * @param description - ページ説明文
 * @param path - ページの絶対パス（`/`, `/contact` 等）
 */
export function buildPageMetadata(title: string, description: string, path: string): Metadata {
	return {
		title,
		description,
		alternates: { canonical: path },
		openGraph: {
			title,
			description,
			url: path,
			images: [OG_IMAGE_PATH],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [OG_IMAGE_PATH],
		},
	};
}
