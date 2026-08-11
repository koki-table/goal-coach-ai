import { describe, expect, it } from "vitest";
import { resolveLogoHref, resolvePrimaryCtaTarget } from "./ctaTarget.helper";

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

describe("resolveLogoHref", () => {
	it("keeps signed-out visitors on the LP itself", () => {
		expect(resolveLogoHref(false)).toBe("/");
	});

	it("sends signed-in users to the default post-login page", () => {
		expect(resolveLogoHref(true)).toBe("/goals");
	});
});
