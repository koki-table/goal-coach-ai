import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoalThreadList } from "./goalThreadList";

const GOALS = [
	{ id: "goal-1", title: "TOEIC800点を取る" },
	{ id: "goal-2", title: "5kg減量する" },
];

describe("GoalThreadList", () => {
	it("highlights the selected goal", () => {
		render(<GoalThreadList goals={GOALS} selectedGoalId="goal-1" onSelectGoal={vi.fn()} />);

		expect(screen.getByRole("button", { name: "TOEIC800点を取る" })).toHaveClass("text-primary");
	});

	it("calls onSelectGoal when a goal is clicked", () => {
		const onSelectGoal = vi.fn();
		render(<GoalThreadList goals={GOALS} selectedGoalId={undefined} onSelectGoal={onSelectGoal} />);

		fireEvent.click(screen.getByRole("button", { name: "5kg減量する" }));
		expect(onSelectGoal).toHaveBeenCalledWith("goal-2");
	});

	it("shows an empty state with a link to create a goal", () => {
		render(<GoalThreadList goals={[]} selectedGoalId={undefined} onSelectGoal={vi.fn()} />);

		expect(screen.getByText(/相談できる目標がありません/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "目標を作成する" })).toBeInTheDocument();
	});
});
