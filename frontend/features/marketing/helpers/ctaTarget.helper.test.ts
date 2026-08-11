import { describe, expect, it } from "vitest";
import { resolvePrimaryCtaTarget } from "./ctaTarget.helper";

describe("resolvePrimaryCtaTarget", () => {
	it("directs signed-out visitors to sign-up", () => {
		expect(resolvePrimaryCtaTarget(false)).toEqual({
			label: "無料で始める",
			href: "/sign-up",
		});
	});

	it("directs signed-in users straight into the app", () => {
		expect(resolvePrimaryCtaTarget(true)).toEqual({
			label: "アプリを開く",
			href: "/goals",
		});
	});
});
