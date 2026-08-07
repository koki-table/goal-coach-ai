import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProposalKeyResult, ProposalObjective } from "../types";
import { ObjectiveProposalWidget } from "./objectiveProposalWidget";

const OBJECTIVE: ProposalObjective = {
	title: "資格を取得する",
	deadline: "2026-12-31",
	category: "study",
};

const KEY_RESULTS: ProposalKeyResult[] = [
	{ title: "模試900点", targetValue: 900, unit: "点", adopted: false },
];

describe("ObjectiveProposalWidget", () => {
	it("renders nothing when objective is null", () => {
		const { container } = render(
			<ObjectiveProposalWidget
				objective={null}
				keyResults={[]}
				onAdopt={vi.fn()}
				isAdopting={false}
				isGoalLimitReached={false}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("shows the objective title, deadline, category, and key results", () => {
		render(
			<ObjectiveProposalWidget
				objective={OBJECTIVE}
				keyResults={KEY_RESULTS}
				onAdopt={vi.fn()}
				isAdopting={false}
				isGoalLimitReached={false}
			/>,
		);

		expect(screen.getByText("資格を取得する")).toBeInTheDocument();
		expect(screen.getByText(/2026-12-31/)).toBeInTheDocument();
		expect(screen.getByText(/学習/)).toBeInTheDocument();
		expect(screen.getByText(/模試900点/)).toBeInTheDocument();
	});

	it("calls onAdopt when the adopt button is clicked", () => {
		const onAdopt = vi.fn();
		render(
			<ObjectiveProposalWidget
				objective={OBJECTIVE}
				keyResults={KEY_RESULTS}
				onAdopt={onAdopt}
				isAdopting={false}
				isGoalLimitReached={false}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "この目標にする" }));
		expect(onAdopt).toHaveBeenCalledTimes(1);
	});

	it("disables the adopt button and shows a reason when the goal limit is reached", () => {
		render(
			<ObjectiveProposalWidget
				objective={OBJECTIVE}
				keyResults={KEY_RESULTS}
				onAdopt={vi.fn()}
				isAdopting={false}
				isGoalLimitReached={true}
			/>,
		);

		expect(screen.getByRole("button", { name: "この目標にする" })).toBeDisabled();
		expect(screen.getByText(/目標は同時に2件までしか設定できません/)).toBeInTheDocument();
	});

	it("shows adopted state when all key results are adopted", () => {
		render(
			<ObjectiveProposalWidget
				objective={OBJECTIVE}
				keyResults={[{ ...KEY_RESULTS[0], adopted: true, createdMilestoneId: "m-1" }]}
				onAdopt={vi.fn()}
				isAdopting={false}
				isGoalLimitReached={false}
			/>,
		);

		expect(screen.getByRole("button", { name: "採用済み" })).toBeDisabled();
	});
});
