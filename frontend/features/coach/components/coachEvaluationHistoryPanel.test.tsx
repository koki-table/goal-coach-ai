import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoachEvaluationHistoryPanel } from "./coachEvaluationHistoryPanel";

const HISTORY = [
	{
		id: "eval-1",
		persona: "harsh",
		progressPercent: 30,
		feedback: "進捗が遅れている",
		successRate: 40,
		suggestions: ["A社に連絡する"],
		createdAt: "2026-01-01T00:00:00.000Z",
	},
];

describe("CoachEvaluationHistoryPanel", () => {
	it("collapses history by default and expands on click", () => {
		render(<CoachEvaluationHistoryPanel history={HISTORY} isLoading={false} />);

		expect(screen.queryByText("進捗が遅れている")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /評価履歴/ }));

		expect(screen.getByText("進捗が遅れている")).toBeInTheDocument();
	});

	it("shows empty state when history is empty", () => {
		render(<CoachEvaluationHistoryPanel history={[]} isLoading={false} />);

		fireEvent.click(screen.getByRole("button", { name: /評価履歴/ }));

		expect(screen.getByText("まだ評価履歴がありません")).toBeInTheDocument();
	});

	it("shows loading state", () => {
		render(<CoachEvaluationHistoryPanel history={[]} isLoading={true} />);

		fireEvent.click(screen.getByRole("button", { name: /評価履歴/ }));

		expect(screen.getByText("読み込み中...")).toBeInTheDocument();
	});
});
