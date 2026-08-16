import { describe, expect, it } from "vitest";
import type { ProposalTodoUpdate } from "../types";
import {
	getTodoUpdateActionLabel,
	getTodoUpdateChangeLines,
	isTodoUpdateDestructive,
} from "./todoUpdateDisplay.helper";

const BASE: ProposalTodoUpdate = {
	todoId: "t-1",
	todoTitle: "過去問を1日1回演習する",
	reason: "期限超過が続いている",
	adopted: false,
};

describe("getTodoUpdateChangeLines", () => {
	it("suggestedDueDateのみ提案されている場合は期限の行だけ返す", () => {
		const lines = getTodoUpdateChangeLines({
			...BASE,
			baselineDueDate: "2026-08-01",
			suggestedDueDate: "2026-09-01",
		});
		expect(lines).toEqual(["期限: 2026-09-01"]);
	});

	it("suggestedDueDateがnullの場合は「未設定」と表示する", () => {
		const lines = getTodoUpdateChangeLines({
			...BASE,
			baselineDueDate: "2026-08-01",
			suggestedDueDate: null,
		});
		expect(lines).toEqual(["期限: 未設定"]);
	});

	it("priority/title/dueDateが同時提案されている場合は3行全て返す", () => {
		const lines = getTodoUpdateChangeLines({
			...BASE,
			baselineDueDate: "2026-08-01",
			suggestedDueDate: "2026-09-01",
			baselinePriority: "medium",
			suggestedPriority: "high",
			baselineTitle: "過去問を1日1回演習する",
			suggestedTitle: "過去問を10分だけ演習する",
		});
		expect(lines).toEqual([
			"期限: 2026-09-01",
			"優先度: 高",
			"新しい内容: 過去問を10分だけ演習する",
		]);
	});

	it("suggestedActionのみの場合は空配列を返す", () => {
		const lines = getTodoUpdateChangeLines({ ...BASE, suggestedAction: "delete" });
		expect(lines).toEqual([]);
	});
});

describe("getTodoUpdateActionLabel", () => {
	it("suggestedAction=deleteは「削除する」を返す", () => {
		expect(getTodoUpdateActionLabel({ ...BASE, suggestedAction: "delete" })).toBe("削除する");
	});

	it("suggestedAction=completeは「完了にする」を返す", () => {
		expect(getTodoUpdateActionLabel({ ...BASE, suggestedAction: "complete" })).toBe("完了にする");
	});

	it("suggestedActionが無い場合は「この内容に更新する」を返す", () => {
		expect(getTodoUpdateActionLabel({ ...BASE, suggestedDueDate: "2026-09-01" })).toBe(
			"この内容に更新する",
		);
	});
});

describe("isTodoUpdateDestructive", () => {
	it("suggestedAction=deleteの時のみtrueを返す", () => {
		expect(isTodoUpdateDestructive({ ...BASE, suggestedAction: "delete" })).toBe(true);
		expect(isTodoUpdateDestructive({ ...BASE, suggestedAction: "complete" })).toBe(false);
		expect(isTodoUpdateDestructive({ ...BASE, suggestedDueDate: "2026-09-01" })).toBe(false);
	});
});
