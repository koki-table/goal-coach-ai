import type { ApiError } from "./types";

export function createApiError(status: number, message: string, info?: unknown): ApiError {
	return { status, message, info };
}

export function isRetryableError(status: number): boolean {
	return status >= 500;
}

export function parseErrorMessage(body: unknown): string {
	if (body && typeof body === "object" && "message" in body) {
		const msg = (body as { message: unknown }).message;
		if (typeof msg === "string") {
			return msg;
		}
	}

	if (typeof body === "string" && body.length > 0) {
		return body;
	}

	return "An unexpected error occurred";
}
