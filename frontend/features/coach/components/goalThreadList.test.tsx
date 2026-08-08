import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoalThreadList } from "./goalThreadList";

const GOALS = [
	{ id: "goal-1", title: "TOEIC800点を取る" },
	{ id: "goal-2", title: "5kg減量する" },
];

describe("GoalThreadList", () => {
	it("highlights the selected goal", () => {
		render(
			<GoalThreadList
				goals={GOALS}
				selectedThread={{ kind: "goal", goalId: "goal-1" }}
				onSelectGoal={vi.fn()}
				onSelectExploration={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "TOEIC800点を取る" })).toHaveClass("text-primary");
	});

	it("calls onSelectGoal when a goal is clicked", () => {
		const onSelectGoal = vi.fn();
		render(
			<GoalThreadList
				goals={GOALS}
				selectedThread={undefined}
				onSelectGoal={onSelectGoal}
				onSelectExploration={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "5kg減量する" }));
		expect(onSelectGoal).toHaveBeenCalledWith("goal-2");
	});

	it("always shows the exploration entry, even with no goals", () => {
		render(
			<GoalThreadList
				goals={[]}
				selectedThread={undefined}
				onSelectGoal={vi.fn()}
				onSelectExploration={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "目標を決める相談" })).toBeInTheDocument();
	});

	it("calls onSelectExploration when the exploration entry is clicked", () => {
		const onSelectExploration = vi.fn();
		render(
			<GoalThreadList
				goals={GOALS}
				selectedThread={undefined}
				onSelectGoal={vi.fn()}
				onSelectExploration={onSelectExploration}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "目標を決める相談" }));
		expect(onSelectExploration).toHaveBeenCalledTimes(1);
	});

	it("highlights the exploration entry when selected", () => {
		render(
			<GoalThreadList
				goals={GOALS}
				selectedThread={{ kind: "exploration" }}
				onSelectGoal={vi.fn()}
				onSelectExploration={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "目標を決める相談" })).toHaveClass("text-primary");
	});

	it("renders a dropdown instead of the nav list on mobile widths", () => {
		vi.spyOn(window, "matchMedia").mockReturnValue({
			matches: true,
			media: "(max-width: 767px)",
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		} as unknown as MediaQueryList);

		const onSelectGoal = vi.fn();
		render(
			<GoalThreadList
				goals={GOALS}
				selectedThread={{ kind: "goal", goalId: "goal-2" }}
				onSelectGoal={onSelectGoal}
				onSelectExploration={vi.fn()}
			/>,
		);

		const select = screen.getByRole("combobox", { name: "目標一覧" });
		expect(select).toHaveValue("goal-2");
		expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

		fireEvent.change(select, { target: { value: "goal-1" } });
		expect(onSelectGoal).toHaveBeenCalledWith("goal-1");
	});
});
