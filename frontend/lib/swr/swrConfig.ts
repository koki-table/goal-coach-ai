import { isRetryableError } from "./fetcher.helper";
import type { ApiError } from "./types";

export const swrConfig = {
	revalidateOnFocus: true,
	revalidateOnReconnect: true,
	dedupingInterval: 2000,
	errorRetryCount: 3,
	errorRetryInterval: 5000,
	shouldRetryOnError: (error: unknown): boolean => {
		if (error && typeof error === "object" && "status" in error) {
			return isRetryableError((error as ApiError).status);
		}
		return false;
	},
};
