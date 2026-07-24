import { ApiClientError } from "@/lib/swr/apiClient";
import { describe, expect, it } from "vitest";
import { mapCoachError } from "./coachErrorMessage.helper";

describe("mapCoachError", () => {
	it("400はvalidationとして扱う", () => {
		const result = mapCoachError(new ApiClientError(400, "Validation error"));
		expect(result.kind).toBe("validation");
	});

	it("404はgoalNotFoundとして扱う", () => {
		const result = mapCoachError(new ApiClientError(404, "Goal not found"));
		expect(result.kind).toBe("goalNotFound");
	});

	it("429はrateLimitとして扱う", () => {
		const result = mapCoachError(new ApiClientError(429, "Rate limit exceeded"));
		expect(result.kind).toBe("rateLimit");
	});

	it("503はnotConfiguredとして扱う", () => {
		const result = mapCoachError(new ApiClientError(503, "Coach evaluation is not configured"));
		expect(result.kind).toBe("notConfigured");
	});

	it("500など未知の5xxはunknownとして扱う", () => {
		const result = mapCoachError(new ApiClientError(500, "Internal server error"));
		expect(result.kind).toBe("unknown");
	});

	it("ステータス不明のエラーはnetworkとして扱う", () => {
		const result = mapCoachError(new Error("network failure"));
		expect(result.kind).toBe("network");
	});
});
