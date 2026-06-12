"use client";

import { useAuth } from "@clerk/nextjs";
import { SWRConfig } from "swr";
import { createFetcher } from "./fetcher";
import { swrConfig } from "./swrConfig";

type SWRProviderProps = {
	children: React.ReactNode;
};

export function SWRProvider({ children }: SWRProviderProps) {
	const { getToken, isLoaded, isSignedIn } = useAuth();
	const fetcher = createFetcher(getToken);

	return (
		<SWRConfig value={{ ...swrConfig, fetcher, isPaused: () => !isLoaded || !isSignedIn }}>
			{children}
		</SWRConfig>
	);
}
