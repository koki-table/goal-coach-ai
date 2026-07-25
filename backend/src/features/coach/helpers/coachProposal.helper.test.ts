import { describe, expect, it } from "vitest";
import type { PlanProposal } from "../prompts/coachPrompts";
import { toPromptMessage, toProposalPayload } from "./coachProposal.helper";

describe("toPromptMessage", () => {
	it("proposalを持たないuserメッセージはそのまま変換する", () => {
		const result = toPromptMessage({ role: "user", content: "こんにちは", proposal: null });
		expect(result).toEqual({ role: "user", content: "こんにちは" });
	});

	it("user以外のroleはassistantに正規化する", () => {
		const result = toPromptMessage({ role: "system", content: "x", proposal: null });
		expect(result.role).toBe("assistant");
	});

	it("proposalを持つassistantメッセージは採用状態を明示した形に変換する", () => {
		const proposal = JSON.stringify({
			milestone: { title: "基礎を固める", adopted: true, createdMilestoneId: "m1" },
			todos: [
				{ title: "毎日30分", taskType: "daily", adopted: false },
				{ title: "参考書を買う", taskType: "once", adopted: true, createdTodoId: "t1" },
			],
		});

		const result = toPromptMessage({ role: "assistant", content: "提案です", proposal });

		expect(result).toEqual({
			role: "assistant",
			content: "提案です",
			proposal: {
				milestone: { title: "基礎を固める", adopted: true },
				todos: [
					{ title: "毎日30分", adopted: false },
					{ title: "参考書を買う", adopted: true },
				],
			},
		});
	});

	it("milestoneがnullのproposalも変換できる", () => {
		const proposal = JSON.stringify({
			milestone: null,
			todos: [{ title: "やること", taskType: "once", adopted: false }],
		});
		const result = toPromptMessage({ role: "assistant", content: "x", proposal });
		expect(result.proposal?.milestone).toBeNull();
		expect(result.proposal?.todos).toEqual([{ title: "やること", adopted: false }]);
	});
});

describe("toProposalPayload", () => {
	const base: PlanProposal = {
		milestoneTitle: "新しいマイルストーン",
		todos: [
			{ title: "TODO A", taskType: "daily" },
			{ title: "TODO B", taskType: "once" },
		],
	};

	it("既存に無いマイルストーンはadopted=falseで含める", () => {
		const result = toProposalPayload(base, ["別のマイルストーン"]);
		expect(result.milestone).toEqual({ title: "新しいマイルストーン", adopted: false });
	});

	it("既存タイトルと完全一致するマイルストーンは除外する(前後空白は無視)", () => {
		const result = toProposalPayload(base, ["  新しいマイルストーン  "]);
		expect(result.milestone).toBeNull();
	});

	it("milestoneTitleがnullならmilestoneはnull", () => {
		const result = toProposalPayload({ ...base, milestoneTitle: null }, []);
		expect(result.milestone).toBeNull();
	});

	it("todosは全てadopted=falseで変換する", () => {
		const result = toProposalPayload(base, []);
		expect(result.todos).toEqual([
			{ title: "TODO A", taskType: "daily", adopted: false },
			{ title: "TODO B", taskType: "once", adopted: false },
		]);
	});
});
