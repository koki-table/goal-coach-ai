import { createApiError, parseErrorMessage } from "./fetcher.helper";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

export function createFetcher(getToken: () => Promise<string | null>) {
	return async <T>(key: string): Promise<T> => {
		const url = key.startsWith("http") ? key : `${API_BASE_URL}${key}`;
		const token = await getToken();

		const res = await fetch(url, {
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		});

		if (!res.ok) {
			let body: unknown;
			try {
				body = await res.json();
			} catch {
				body = await res.text().catch(() => null);
			}
			throw createApiError(res.status, parseErrorMessage(body), body);
		}

		return res.json() as Promise<T>;
	};
}
