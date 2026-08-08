import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlanProposal } from "../types";
import { PlanProposalWidget } from "./planProposalWidget";

const PROPOSAL_WITH_KEY_RESULT: PlanProposal = {
	version: 1,
	objective: null,
	keyResults: [{ title: "基礎文法を習得する", targetValue: 300, unit: "問", adopted: false }],
	todos: [{ title: "毎日30分学習する", taskType: "daily", adopted: false }],
};

describe("PlanProposalWidget", () => {
	it("renders nothing when keyResults and todos are both empty", () => {
		const proposal: PlanProposal = { version: 1, objective: null, keyResults: [], todos: [] };
		const { container } = render(
			<PlanProposalWidget
				proposal={proposal}
				messageId={1}
				adoptingKey={undefined}
				onAdoptKeyResult={vi.fn()}
				onAdoptTodo={vi.fn()}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("disables todo adoption until the key result is adopted", () => {
		render(
			<PlanProposalWidget
				proposal={PROPOSAL_WITH_KEY_RESULT}
				messageId={1}
				adoptingKey={undefined}
				onAdoptKeyResult={vi.fn()}
				onAdoptTodo={vi.fn()}
			/>,
		);

		const todoButton = screen.getByRole("button", { name: /主要な成果の採用後/ });
		expect(todoButton).toBeDisabled();
	});

	it("enables todo adoption once the key result is adopted", () => {
		const proposal: PlanProposal = {
			version: 1,
			objective: null,
			keyResults: [
				{
					title: "基礎文法を習得する",
					targetValue: 300,
					unit: "問",
					adopted: true,
					createdMilestoneId: "m-1",
				},
			],
			todos: [{ title: "毎日30分学習する", taskType: "daily", adopted: false }],
		};

		render(
			<PlanProposalWidget
				proposal={proposal}
				messageId={1}
				adoptingKey={undefined}
				onAdoptKeyResult={vi.fn()}
				onAdoptTodo={vi.fn()}
			/>,
		);

		const todoButton = screen.getByRole("button", { name: "採用する" });
		expect(todoButton).not.toBeDisabled();
	});

	it("calls onAdoptKeyResult with the key result index when the adopt button is clicked", () => {
		const onAdoptKeyResult = vi.fn();
		render(
			<PlanProposalWidget
				proposal={PROPOSAL_WITH_KEY_RESULT}
				messageId={1}
				adoptingKey={undefined}
				onAdoptKeyResult={onAdoptKeyResult}
				onAdoptTodo={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "採用する" }));
		expect(onAdoptKeyResult).toHaveBeenCalledWith(0);
	});

	it("shows adopted badge for already adopted items", () => {
		const proposal: PlanProposal = {
			version: 1,
			objective: null,
			keyResults: [
				{
					title: "基礎文法を習得する",
					targetValue: 300,
					unit: "問",
					adopted: true,
					createdMilestoneId: "m-1",
				},
			],
			todos: [
				{ title: "毎日30分学習する", taskType: "daily", adopted: true, createdTodoId: "t-1" },
			],
		};

		render(
			<PlanProposalWidget
				proposal={proposal}
				messageId={1}
				adoptingKey={undefined}
				onAdoptKeyResult={vi.fn()}
				onAdoptTodo={vi.fn()}
			/>,
		);

		expect(screen.getAllByText("採用済み")).toHaveLength(2);
	});

	it("renders multiple key results independently", () => {
		const proposal: PlanProposal = {
			version: 1,
			objective: null,
			keyResults: [
				{ title: "模試900点", targetValue: 900, unit: "点", adopted: false },
				{
					title: "TOEIC800点",
					targetValue: 800,
					unit: "点",
					adopted: true,
					createdMilestoneId: "m-2",
				},
			],
			todos: [],
		};

		render(
			<PlanProposalWidget
				proposal={proposal}
				messageId={1}
				adoptingKey={undefined}
				onAdoptKeyResult={vi.fn()}
				onAdoptTodo={vi.fn()}
			/>,
		);

		expect(screen.getByText("模試900点")).toBeInTheDocument();
		expect(screen.getByText("TOEIC800点")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "採用する" })).toBeInTheDocument();
		expect(screen.getByText("採用済み")).toBeInTheDocument();
	});
});
