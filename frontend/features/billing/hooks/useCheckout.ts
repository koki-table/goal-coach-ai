import { createApiClient } from "@/lib/swr/apiClient";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import type { BillingInterval } from "../types";

export function useCheckout() {
	const { getToken } = useAuth();
	const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

	const startCheckout = useCallback(
		async (interval: BillingInterval) => {
			const apiClient = createApiClient(getToken);
			setIsCheckoutLoading(true);
			try {
				const { url } = await apiClient.post<{ url: string }>("/billing/checkout", { interval });
				window.location.href = url;
			} finally {
				setIsCheckoutLoading(false);
			}
		},
		[getToken],
	);

	return { startCheckout, isCheckoutLoading };
}
