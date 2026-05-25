import { describe, expect, it } from "vitest";
import { createApiError, isRetryableError, parseErrorMessage } from "./fetcher.helper";

describe("createApiError", () => {
	it("creates an error with all fields", () => {
		const error = createApiError(404, "Not found", { detail: "missing" });
		expect(error).toEqual({
			status: 404,
			message: "Not found",
			info: { detail: "missing" },
		});
	});

	it("creates an error without info", () => {
		const error = createApiError(500, "Server error");
		expect(error).toEqual({
			status: 500,
			message: "Server error",
			info: undefined,
		});
	});
});

describe("isRetryableError", () => {
	it("returns true for 500", () => {
		expect(isRetryableError(500)).toBe(true);
	});

	it("returns true for 502", () => {
		expect(isRetryableError(502)).toBe(true);
	});

	it("returns true for 503", () => {
		expect(isRetryableError(503)).toBe(true);
	});

	it("returns false for 400", () => {
		expect(isRetryableError(400)).toBe(false);
	});

	it("returns false for 401", () => {
		expect(isRetryableError(401)).toBe(false);
	});

	it("returns false for 404", () => {
		expect(isRetryableError(404)).toBe(false);
	});

	it("returns false for 422", () => {
		expect(isRetryableError(422)).toBe(false);
	});
});

describe("parseErrorMessage", () => {
	it("extracts message from object with message field", () => {
		expect(parseErrorMessage({ message: "Bad request" })).toBe("Bad request");
	});

	it("returns string body as message", () => {
		expect(parseErrorMessage("Something went wrong")).toBe("Something went wrong");
	});

	it("returns default message for null", () => {
		expect(parseErrorMessage(null)).toBe("An unexpected error occurred");
	});

	it("returns default message for undefined", () => {
		expect(parseErrorMessage(undefined)).toBe("An unexpected error occurred");
	});

	it("returns default message for empty string", () => {
		expect(parseErrorMessage("")).toBe("An unexpected error occurred");
	});

	it("returns default message for object without message field", () => {
		expect(parseErrorMessage({ error: "fail" })).toBe("An unexpected error occurred");
	});

	it("returns default message for non-string message field", () => {
		expect(parseErrorMessage({ message: 123 })).toBe("An unexpected error occurred");
	});
});
