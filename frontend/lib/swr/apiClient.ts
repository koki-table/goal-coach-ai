const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787/api";

export class ApiClientError extends Error {
	status: number;
	info?: unknown;

	constructor(status: number, message: string, info?: unknown) {
		super(message);
		this.name = "ApiClientError";
		this.status = status;
		this.info = info;
	}
}

export function createApiClient(getToken: () => Promise<string | null>) {
	async function request<T>(path: string, options: RequestInit): Promise<T> {
		const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
		const token = await getToken();

		const res = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...options.headers,
			},
		});

		if (!res.ok) {
			let body: unknown;
			try {
				body = await res.json();
			} catch {
				body = await res.text().catch(() => null);
			}
			const message =
				body && typeof body === "object" && "message" in body
					? String((body as { message: unknown }).message)
					: `Request failed with status ${res.status}`;
			throw new ApiClientError(res.status, message, body);
		}

		const text = await res.text();
		if (!text) return undefined as T;
		return JSON.parse(text) as T;
	}

	return {
		post<T>(path: string, body: unknown): Promise<T> {
			return request<T>(path, {
				method: "POST",
				body: JSON.stringify(body),
			});
		},
		put<T>(path: string, body: unknown): Promise<T> {
			return request<T>(path, {
				method: "PUT",
				body: JSON.stringify(body),
			});
		},
		patch<T>(path: string, body?: unknown): Promise<T> {
			return request<T>(path, {
				method: "PATCH",
				body: body ? JSON.stringify(body) : undefined,
			});
		},
		del<T>(path: string): Promise<T> {
			return request<T>(path, {
				method: "DELETE",
			});
		},
	};
}

export type ApiClient = ReturnType<typeof createApiClient>;
