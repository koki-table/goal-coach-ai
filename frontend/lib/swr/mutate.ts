import { mutate } from "swr";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

export function revalidateKey(key: string): Promise<unknown> {
	return mutate(key);
}

export function revalidateByPrefix(prefix: string): Promise<unknown> {
	return mutate((key) => typeof key === "string" && key.startsWith(prefix));
}

export async function optimisticMutate<T>(
	key: string,
	updateFn: () => Promise<T>,
	optimisticData: T,
): Promise<T> {
	const result = await mutate(key, updateFn(), {
		optimisticData,
		rollbackOnError: true,
		revalidate: true,
	});
	return result as T;
}

export function apiUrl(path: string): string {
	return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
}
