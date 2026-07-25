import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlanProposal } from "../types";
import { PlanProposalWidget } from "./planProposalWidget";

const PROPOSAL_WITH_MILESTONE: PlanProposal = {
	milestone: { title: "基礎文法を習得する", adopted: false },
	todos: [{ title: "毎日30分学習する", taskType: "daily", adopted: false }],
};

describe("PlanProposalWidget", () => {
	it("disables todo adoption until the milestone is adopted", () => {
		render(
			<PlanProposalWidget
				proposal={PROPOSAL_WITH_MILESTONE}
				messageId={1}
				adoptingKey={undefined}
				onAdoptMilestone={vi.fn()}
				onAdoptTodo={vi.fn()}
			/>,
		);

		const todoButton = screen.getByRole("button", { name: /マイルストーン採用後/ });
		expect(todoButton).toBeDisabled();
	});

	it("enables todo adoption once the milestone is adopted", () => {
		const proposal: PlanProposal = {
			milestone: { title: "基礎文法を習得する", adopted: true, createdMilestoneId: "m-1" },
			todos: [{ title: "毎日30分学習する", taskType: "daily", adopted: false }],
		};

		render(
			<PlanProposalWidget
				proposal={proposal}
				messageId={1}
				adoptingKey={undefined}
				onAdoptMilestone={vi.fn()}
				onAdoptTodo={vi.fn()}
			/>,
		);

		const todoButton = screen.getByRole("button", { name: "採用する" });
		expect(todoButton).not.toBeDisabled();
	});

	it("calls onAdoptMilestone when the milestone adopt button is clicked", () => {
		const onAdoptMilestone = vi.fn();
		render(
			<PlanProposalWidget
				proposal={PROPOSAL_WITH_MILESTONE}
				messageId={1}
				adoptingKey={undefined}
				onAdoptMilestone={onAdoptMilestone}
				onAdoptTodo={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "採用する" }));
		expect(onAdoptMilestone).toHaveBeenCalledTimes(1);
	});

	it("shows adopted badge for already adopted items", () => {
		const proposal: PlanProposal = {
			milestone: { title: "基礎文法を習得する", adopted: true, createdMilestoneId: "m-1" },
			todos: [
				{ title: "毎日30分学習する", taskType: "daily", adopted: true, createdTodoId: "t-1" },
			],
		};

		render(
			<PlanProposalWidget
				proposal={proposal}
				messageId={1}
				adoptingKey={undefined}
				onAdoptMilestone={vi.fn()}
				onAdoptTodo={vi.fn()}
			/>,
		);

		expect(screen.getAllByText("採用済み")).toHaveLength(2);
	});
});
