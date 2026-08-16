import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanCard } from "./planCard";

describe("PlanCard", () => {
	it("shows both plans' feature lists regardless of the current tier", () => {
		render(
			<PlanCard
				tier="free"
				status="active"
				cancelAtPeriodEnd={false}
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		expect(screen.getByText("ペンタ君との対話 1日3回まで")).toBeInTheDocument();
		expect(screen.getByText("対話・提案 無制限")).toBeInTheDocument();
		expect(screen.getByText("高性能なAIモデル")).toBeInTheDocument();
	});

	it("marks the free card as current and shows usage + upgrade CTAs for the free tier", () => {
		render(
			<PlanCard
				tier="free"
				status="active"
				usageLabel="本日の残り: 2回"
				cancelAtPeriodEnd={false}
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		const freeCard = screen.getByText("無料プラン").closest("[data-slot=card]")
			?.parentElement as HTMLElement;
		const proCard = screen.getByText("Proプラン").closest("[data-slot=card]")
			?.parentElement as HTMLElement;

		expect(within(freeCard).getByText("ご利用中")).toBeInTheDocument();
		expect(within(freeCard).getByText("本日の残り: 2回")).toBeInTheDocument();
		expect(within(freeCard).getByRole("button", { name: /月額/ })).toBeInTheDocument();
		expect(within(freeCard).getByRole("button", { name: /年額/ })).toBeInTheDocument();

		expect(within(proCard).queryByText("ご利用中")).not.toBeInTheDocument();
		expect(within(proCard).getByRole("button", { name: /月額/ })).toBeInTheDocument();
		expect(within(proCard).getByRole("button", { name: /年額/ })).toBeInTheDocument();
	});

	it("shows a fixed monthly price on the pro card while on the free tier", () => {
		render(
			<PlanCard
				tier="free"
				status="active"
				cancelAtPeriodEnd={false}
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		const proCard = screen.getByText("Proプラン").closest("[data-slot=card]")
			?.parentElement as HTMLElement;
		expect(within(proCard).getByText("¥980")).toBeInTheDocument();
	});

	it("marks the pro card as current and shows the monthly interval label and manage button", () => {
		render(
			<PlanCard
				tier="pro"
				status="active"
				interval="monthly"
				cancelAtPeriodEnd={false}
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		const freeCard = screen.getByText("無料プラン").closest("[data-slot=card]")
			?.parentElement as HTMLElement;
		const proCard = screen.getByText("Proプラン").closest("[data-slot=card]")
			?.parentElement as HTMLElement;

		expect(within(proCard).getByText("ご利用中")).toBeInTheDocument();
		expect(within(proCard).getByText("月額プラン")).toBeInTheDocument();
		expect(within(proCard).getByRole("button", { name: /お支払い方法/ })).toBeInTheDocument();
		expect(within(freeCard).queryByText("ご利用中")).not.toBeInTheDocument();
		expect(within(freeCard).queryByRole("button")).not.toBeInTheDocument();
	});

	it("shows the yearly interval label for a pro tier user on the yearly interval", () => {
		render(
			<PlanCard
				tier="pro"
				status="active"
				interval="yearly"
				cancelAtPeriodEnd={false}
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		const proCard = screen.getByText("Proプラン").closest("[data-slot=card]")
			?.parentElement as HTMLElement;
		expect(within(proCard).getByText("年額プラン")).toBeInTheDocument();
	});

	it("does not show an interval label when interval is unknown", () => {
		render(
			<PlanCard
				tier="pro"
				status="active"
				cancelAtPeriodEnd={false}
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		expect(screen.queryByText(/月額プラン|年額プラン/)).not.toBeInTheDocument();
	});

	it("shows a payment-failure banner on the pro card for a past_due pro tier", () => {
		render(
			<PlanCard
				tier="pro"
				status="past_due"
				cancelAtPeriodEnd={false}
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		const proCard = screen.getByText("Proプラン").closest("[data-slot=card]")
			?.parentElement as HTMLElement;
		expect(within(proCard).getByText(/お支払いに問題が発生しています/)).toBeInTheDocument();
	});

	it("shows a cancel notice with the period end date on the pro card when cancelAtPeriodEnd is true", () => {
		render(
			<PlanCard
				tier="pro"
				status="active"
				interval="monthly"
				cancelAtPeriodEnd={true}
				currentPeriodEnd="2026-09-12T00:00:00.000Z"
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		const proCard = screen.getByText("Proプラン").closest("[data-slot=card]")
			?.parentElement as HTMLElement;
		expect(within(proCard).getByText(/2026年9月12日まで利用でき/)).toBeInTheDocument();
	});

	it("does not show a cancel notice when cancelAtPeriodEnd is false", () => {
		render(
			<PlanCard
				tier="pro"
				status="active"
				interval="monthly"
				cancelAtPeriodEnd={false}
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		expect(screen.queryByText(/無料プランに切り替わります/)).not.toBeInTheDocument();
	});
});
