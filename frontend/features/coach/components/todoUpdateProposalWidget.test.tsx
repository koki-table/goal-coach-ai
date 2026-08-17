import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProposalTodoUpdate } from "../types";
import { TodoUpdateProposalWidget } from "./todoUpdateProposalWidget";

const FIELD_UPDATE: ProposalTodoUpdate = {
	todoId: "t-1",
	todoTitle: "過去問を1日1回演習する",
	baselineDueDate: "2026-08-01",
	suggestedDueDate: "2026-09-01",
	reason: "期限超過が続いている",
	adopted: false,
};

const DELETE_UPDATE: ProposalTodoUpdate = {
	todoId: "t-2",
	todoTitle: "もう使わない教材を読む",
	suggestedAction: "delete",
	reason: "目標達成にもう寄与しない",
	adopted: false,
};

describe("TodoUpdateProposalWidget", () => {
	it("renders nothing when todoUpdates is empty", () => {
		const { container } = render(
			<TodoUpdateProposalWidget
				todoUpdates={[]}
				messageId={1}
				adoptingKey={undefined}
				onAdopt={vi.fn()}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("renders the todo title, reason, and suggested field changes", () => {
		render(
			<TodoUpdateProposalWidget
				todoUpdates={[FIELD_UPDATE]}
				messageId={1}
				adoptingKey={undefined}
				onAdopt={vi.fn()}
			/>,
		);

		expect(screen.getByText("過去問を1日1回演習する")).toBeInTheDocument();
		expect(screen.getByText("期限超過が続いている")).toBeInTheDocument();
		expect(screen.getByText("期限: 2026-09-01")).toBeInTheDocument();
	});

	it("calls onAdopt with the todo update index when the button is clicked", () => {
		const onAdopt = vi.fn();
		render(
			<TodoUpdateProposalWidget
				todoUpdates={[FIELD_UPDATE]}
				messageId={1}
				adoptingKey={undefined}
				onAdopt={onAdopt}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "この内容に更新する" }));
		expect(onAdopt).toHaveBeenCalledWith(0);
	});

	it("renders a delete proposal with destructive styling and label", () => {
		render(
			<TodoUpdateProposalWidget
				todoUpdates={[DELETE_UPDATE]}
				messageId={1}
				adoptingKey={undefined}
				onAdopt={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "削除する" })).toBeInTheDocument();
	});

	it("disables the button and shows adopted state when already adopted", () => {
		render(
			<TodoUpdateProposalWidget
				todoUpdates={[{ ...FIELD_UPDATE, adopted: true, appliedAt: "2026-08-11T00:00:00.000Z" }]}
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
			<TodoUpdateProposalWidget
				todoUpdates={[FIELD_UPDATE]}
				messageId={1}
				adoptingKey="1:tu:0"
				onAdopt={vi.fn()}
			/>,
		);

		const button = screen.getByRole("button", { name: "反映中..." });
		expect(button).toBeDisabled();
	});

	it("renders multiple todo updates independently", () => {
		render(
			<TodoUpdateProposalWidget
				todoUpdates={[FIELD_UPDATE, DELETE_UPDATE]}
				messageId={1}
				adoptingKey={undefined}
				onAdopt={vi.fn()}
			/>,
		);

		expect(screen.getByText("過去問を1日1回演習する")).toBeInTheDocument();
		expect(screen.getByText("もう使わない教材を読む")).toBeInTheDocument();
	});
});
