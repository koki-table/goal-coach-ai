import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProposalMilestoneUpdate } from "../types";
import { MilestoneUpdateProposalWidget } from "./milestoneUpdateProposalWidget";

const UPDATE: ProposalMilestoneUpdate = {
	milestoneId: "m-1",
	milestoneTitle: "模試900点",
	baselineCurrentValue: 500,
	suggestedCurrentValue: 700,
	reason: "TODOの完了ペースから推定",
	adopted: false,
};

describe("MilestoneUpdateProposalWidget", () => {
	it("renders nothing when milestoneUpdates is empty", () => {
		const { container } = render(
			<MilestoneUpdateProposalWidget
				milestoneUpdates={[]}
				messageId={1}
				adoptingKey={undefined}
				onAdopt={vi.fn()}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("renders the milestone title, reason, and suggested value", () => {
		render(
			<MilestoneUpdateProposalWidget
				milestoneUpdates={[UPDATE]}
				messageId={1}
				adoptingKey={undefined}
				onAdopt={vi.fn()}
			/>,
		);

		expect(screen.getByText("模試900点")).toBeInTheDocument();
		expect(screen.getByText("TODOの完了ペースから推定")).toBeInTheDocument();
		expect(screen.getByText(/推定の現在値: 700/)).toBeInTheDocument();
	});

	it("calls onAdopt with the milestone update index when the button is clicked", () => {
		const onAdopt = vi.fn();
		render(
			<MilestoneUpdateProposalWidget
				milestoneUpdates={[UPDATE]}
				messageId={1}
				adoptingKey={undefined}
				onAdopt={onAdopt}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "この値を反映する" }));
		expect(onAdopt).toHaveBeenCalledWith(0);
	});

	it("disables the button and shows adopted state when already adopted", () => {
		render(
			<MilestoneUpdateProposalWidget
				milestoneUpdates={[{ ...UPDATE, adopted: true, appliedCurrentValue: 700 }]}
				messageId={1}
				adoptingKey={undefined}
				onAdopt={vi.fn()}
			/>,
		);

		const button = screen.getByRole("button", { name: /反映済み/ });
		expect(button).toBeDisabled();
	});

	it("shows adopting state while the request is in flight", () => {
		render(
			<MilestoneUpdateProposalWidget
				milestoneUpdates={[UPDATE]}
				messageId={1}
				adoptingKey="1:mu:0"
				onAdopt={vi.fn()}
			/>,
		);

		const button = screen.getByRole("button", { name: "反映中..." });
		expect(button).toBeDisabled();
	});

	it("renders multiple milestone updates independently", () => {
		const second: ProposalMilestoneUpdate = {
			milestoneId: "m-2",
			milestoneTitle: "TOEIC800点",
			baselineCurrentValue: 400,
			suggestedCurrentValue: 600,
			reason: "期限超過が続いている",
			adopted: false,
		};

		render(
			<MilestoneUpdateProposalWidget
				milestoneUpdates={[UPDATE, second]}
				messageId={1}
				adoptingKey={undefined}
				onAdopt={vi.fn()}
			/>,
		);

		expect(screen.getByText("模試900点")).toBeInTheDocument();
		expect(screen.getByText("TOEIC800点")).toBeInTheDocument();
		expect(screen.getAllByRole("button", { name: "この値を反映する" })).toHaveLength(2);
	});
});
