import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanCard } from "./planCard";

describe("PlanCard", () => {
	it("shows the usage label and upgrade CTAs for the free tier", () => {
		render(
			<PlanCard
				tier="free"
				status="active"
				usageLabel="本日の残り: 2回"
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		expect(screen.getByText("本日の残り: 2回")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /月額/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /年額/ })).toBeInTheDocument();
	});

	it("does not show any usage count for an active pro tier (keeps the unlimited claim)", () => {
		render(
			<PlanCard
				tier="pro"
				status="active"
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		expect(screen.getByText("AIコーチは実質無制限にご利用いただけます。")).toBeInTheDocument();
		expect(screen.queryByText(/残り/)).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /お支払い方法/ })).toBeInTheDocument();
	});

	it("shows a payment-failure banner for a past_due pro tier", () => {
		render(
			<PlanCard
				tier="pro"
				status="past_due"
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		expect(screen.getByText(/お支払いに問題が発生しています/)).toBeInTheDocument();
	});

	it("shows the monthly plan label for a pro tier user on the monthly interval", () => {
		render(
			<PlanCard
				tier="pro"
				status="active"
				interval="monthly"
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		expect(screen.getByText("(月額プラン)")).toBeInTheDocument();
	});

	it("shows the yearly plan label for a pro tier user on the yearly interval", () => {
		render(
			<PlanCard
				tier="pro"
				status="active"
				interval="yearly"
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		expect(screen.getByText("(年額プラン)")).toBeInTheDocument();
	});

	it("does not show a plan interval label when interval is unknown", () => {
		render(
			<PlanCard
				tier="pro"
				status="active"
				isCheckoutLoading={false}
				isPortalLoading={false}
				onUpgrade={vi.fn()}
				onManage={vi.fn()}
			/>,
		);

		expect(screen.queryByText(/月額プラン|年額プラン/)).not.toBeInTheDocument();
	});
});
