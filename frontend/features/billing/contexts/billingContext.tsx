"use client";

import { createContext, useContext } from "react";
import { useBillingPortal } from "../hooks/useBillingPortal";
import { useCheckout } from "../hooks/useCheckout";
import { useSubscription } from "../hooks/useSubscription";
import type { BillingInterval, SubscriptionStatus, SubscriptionTier } from "../types";

type BillingContextValue = {
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	isLoading: boolean;
	decidedMessagesUsedToday: number;
	startCheckout: (interval: BillingInterval) => Promise<void>;
	isCheckoutLoading: boolean;
	openPortal: () => Promise<void>;
	isPortalLoading: boolean;
};

const BillingContext = createContext<BillingContextValue | undefined>(undefined);

type BillingProviderProps = {
	children: React.ReactNode;
};

export function BillingProvider({ children }: BillingProviderProps) {
	const { data, isLoading } = useSubscription();
	const { startCheckout, isCheckoutLoading } = useCheckout();
	const { openPortal, isPortalLoading } = useBillingPortal();

	const value: BillingContextValue = {
		tier: data?.tier ?? "free",
		status: data?.status ?? "active",
		isLoading,
		decidedMessagesUsedToday: data?.decidedMessagesUsedToday ?? 0,
		startCheckout,
		isCheckoutLoading,
		openPortal,
		isPortalLoading,
	};

	return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBillingContext(): BillingContextValue {
	const ctx = useContext(BillingContext);
	if (!ctx) {
		throw new Error("useBillingContext must be used within a BillingProvider");
	}
	return ctx;
}
