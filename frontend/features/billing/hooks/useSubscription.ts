import type { SwrResponse } from "@/lib/swr/types";
import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import type { BillingStatus } from "../types";

export function useSubscription(): SwrResponse<BillingStatus> {
	const { isLoaded, isSignedIn } = useAuth();

	const { data, error, isLoading, isValidating, mutate } = useSWR<BillingStatus>(
		isLoaded && isSignedIn ? "/billing/status" : null,
	);

	return {
		data,
		error,
		isLoading: isLoading || !isLoaded,
		isValidating,
		mutate: () => mutate(),
	};
}
