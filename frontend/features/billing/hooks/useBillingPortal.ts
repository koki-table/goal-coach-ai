import { createApiClient } from "@/lib/swr/apiClient";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useState } from "react";

export function useBillingPortal() {
	const { getToken } = useAuth();
	const [isPortalLoading, setIsPortalLoading] = useState(false);

	const openPortal = useCallback(async () => {
		const apiClient = createApiClient(getToken);
		setIsPortalLoading(true);
		try {
			const { url } = await apiClient.post<{ url: string }>("/billing/portal", {});
			window.location.href = url;
		} finally {
			setIsPortalLoading(false);
		}
	}, [getToken]);

	return { openPortal, isPortalLoading };
}
