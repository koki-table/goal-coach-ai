import { describe, expect, it } from "vitest";
import { buildPageMetadata } from "./pageMetadata.helper";

describe("buildPageMetadata", () => {
	it("builds title/description/canonical and OGP/Twitter fields from the given path", () => {
		const metadata = buildPageMetadata("タイトル", "説明文", "/contact");

		expect(metadata.title).toBe("タイトル");
		expect(metadata.description).toBe("説明文");
		expect(metadata.alternates).toEqual({ canonical: "/contact" });
		expect(metadata.openGraph).toMatchObject({
			title: "タイトル",
			description: "説明文",
			url: "/contact",
			images: ["/penguin-talk.png"],
		});
		expect(metadata.twitter).toMatchObject({
			card: "summary_large_image",
			title: "タイトル",
			description: "説明文",
			images: ["/penguin-talk.png"],
		});
	});
});
