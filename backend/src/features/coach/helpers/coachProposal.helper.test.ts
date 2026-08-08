import { describe, expect, it } from "vitest";
import type { CoachProposal, PlanProposal } from "../prompts/coachPrompts";
import {
	parseProposalPayload,
	toPromptMessage,
	toProposalEnvelope,
	toProposalPayload,
} from "./coachProposal.helper";

describe("toPromptMessage", () => {
	it("proposalを持たないuserメッセージはそのまま変換する", () => {
		const result = toPromptMessage({ role: "user", content: "こんにちは", proposal: null });
		expect(result).toEqual({ role: "user", content: "こんにちは" });
	});

	it("user以外のroleはassistantに正規化する", () => {
		const result = toPromptMessage({ role: "system", content: "x", proposal: null });
		expect(result.role).toBe("assistant");
	});

	it("レガシー形式のproposalを持つassistantメッセージは採用状態を明示した形に変換する", () => {
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
				objective: null,
				keyResults: [{ title: "基礎を固める", adopted: true }],
				todos: [
					{ title: "毎日30分", adopted: false },
					{ title: "参考書を買う", adopted: true },
				],
			},
		});
	});

	it("milestoneがnullのレガシーproposalも変換できる", () => {
		const proposal = JSON.stringify({
			milestone: null,
			todos: [{ title: "やること", taskType: "once", adopted: false }],
		});
		const result = toPromptMessage({ role: "assistant", content: "x", proposal });
		expect(result.proposal?.objective).toBeNull();
		expect(result.proposal?.keyResults).toEqual([]);
		expect(result.proposal?.todos).toEqual([{ title: "やること", adopted: false }]);
	});

	it("version:1形式でobjectiveがありKR全採用なら採用済みとして表示する", () => {
		const proposal = JSON.stringify({
			version: 1,
			objective: { title: "資格取得", deadline: "2026-12-31", category: "study" },
			keyResults: [{ title: "模試900点", targetValue: 900, unit: "点", adopted: true }],
			todos: [],
		});

		const result = toPromptMessage({ role: "assistant", content: "提案です", proposal });

		expect(result.proposal?.objective).toEqual({ title: "資格取得", adopted: true });
	});

	it("version:1形式でobjectiveがありKRが未採用のものを含むなら未採用として表示する", () => {
		const proposal = JSON.stringify({
			version: 1,
			objective: { title: "資格取得", deadline: "2026-12-31", category: "study" },
			keyResults: [{ title: "模試900点", targetValue: 900, unit: "点", adopted: false }],
			todos: [],
		});

		const result = toPromptMessage({ role: "assistant", content: "提案です", proposal });

		expect(result.proposal?.objective).toEqual({ title: "資格取得", adopted: false });
	});
});

describe("toProposalPayload", () => {
	const base: PlanProposal = {
		milestoneTitle: "新しいマイルストーン",
		milestoneTargetValue: 900,
		milestoneUnit: "点",
		todos: [
			{ title: "TODO A", taskType: "daily" },
			{ title: "TODO B", taskType: "once" },
		],
	};

	it("既存に無いマイルストーンはadopted=falseで定量目標付きで含める", () => {
		const result = toProposalPayload(base, ["別のマイルストーン"]);
		expect(result.milestone).toEqual({
			title: "新しいマイルストーン",
			targetValue: 900,
			unit: "点",
			adopted: false,
		});
	});

	it("定量目標がnullなら0〜100%スケール(目標100/単位%)にフォールバックする", () => {
		const result = toProposalPayload(
			{ ...base, milestoneTargetValue: null, milestoneUnit: null },
			[],
		);
		expect(result.milestone).toEqual({
			title: "新しいマイルストーン",
			targetValue: 100,
			unit: "%",
			adopted: false,
		});
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

describe("parseProposalPayload", () => {
	it("レガシー{milestone,todos}形式をversion:1のProposalEnvelopeへ正規化する", () => {
		const raw = JSON.stringify({
			milestone: { title: "基礎を固める", targetValue: 100, unit: "%", adopted: false },
			todos: [{ title: "毎日30分", taskType: "daily", adopted: false }],
		});

		const result = parseProposalPayload(raw);

		expect(result).toEqual({
			version: 1,
			objective: null,
			keyResults: [{ title: "基礎を固める", targetValue: 100, unit: "%", adopted: false }],
			todos: [{ title: "毎日30分", taskType: "daily", adopted: false }],
		});
	});

	it("レガシー形式でmilestoneがnullならkeyResultsは空配列になる", () => {
		const raw = JSON.stringify({
			milestone: null,
			todos: [{ title: "やること", taskType: "once", adopted: false }],
		});

		const result = parseProposalPayload(raw);

		expect(result.keyResults).toEqual([]);
		expect(result.objective).toBeNull();
	});

	it("version:1形式はそのまま返す(idempotent)", () => {
		const envelope = {
			version: 1 as const,
			objective: { title: "資格取得", deadline: "2026-12-31", category: "study" as const },
			keyResults: [{ title: "模試900点", targetValue: 900, unit: "点", adopted: true }],
			todos: [{ title: "参考書を買う", taskType: "once" as const, adopted: false }],
		};
		const raw = JSON.stringify(envelope);

		expect(parseProposalPayload(raw)).toEqual(envelope);
	});

	it("nullのJSONでも例外を投げず空エンベロープにフォールバックする", () => {
		expect(parseProposalPayload("null")).toEqual({
			version: 1,
			objective: null,
			keyResults: [],
			todos: [],
		});
	});

	it("プリミティブのJSONでも例外を投げず空エンベロープにフォールバックする", () => {
		expect(parseProposalPayload("42")).toEqual({
			version: 1,
			objective: null,
			keyResults: [],
			todos: [],
		});
	});

	it("レガシー形式でtodosが欠損していても空配列にフォールバックする", () => {
		const raw = JSON.stringify({ milestone: null });
		expect(parseProposalPayload(raw).todos).toEqual([]);
	});
});

describe("toProposalEnvelope", () => {
	const base: CoachProposal = {
		objective: { title: "資格取得", deadline: "2026-12-31", category: "study" },
		keyResults: [{ title: "模試900点", targetValue: 900, unit: "点" }],
		todos: [
			{ title: "TODO A", taskType: "daily" },
			{ title: "TODO B", taskType: "once" },
		],
	};

	it("undecidedスレッドではobjectiveをそのまま通す", () => {
		const result = toProposalEnvelope(base, {
			objectiveStatus: "undecided",
			existingKeyResultTitles: [],
		});
		expect(result.objective).toEqual(base.objective);
	});

	it("decidedスレッドではobjectiveを常にnullへ強制する", () => {
		const result = toProposalEnvelope(base, {
			objectiveStatus: "decided",
			existingKeyResultTitles: [],
		});
		expect(result.objective).toBeNull();
	});

	it("既存KRタイトルと完全一致するKRは除外する(前後空白は無視)", () => {
		const result = toProposalEnvelope(base, {
			objectiveStatus: "undecided",
			existingKeyResultTitles: ["  模試900点  "],
		});
		expect(result.keyResults).toEqual([]);
	});

	it("定量目標がnullなら0〜100%スケール(目標100/単位%)にフォールバックする", () => {
		const result = toProposalEnvelope(
			{ ...base, keyResults: [{ title: "新KR", targetValue: null, unit: null }] },
			{ objectiveStatus: "undecided", existingKeyResultTitles: [] },
		);
		expect(result.keyResults).toEqual([
			{ title: "新KR", targetValue: 100, unit: "%", adopted: false },
		]);
	});

	it("keyResultsとtodosはすべてadopted=falseで変換する", () => {
		const result = toProposalEnvelope(base, {
			objectiveStatus: "undecided",
			existingKeyResultTitles: [],
		});
		expect(result.keyResults[0].adopted).toBe(false);
		expect(result.todos).toEqual([
			{ title: "TODO A", taskType: "daily", adopted: false },
			{ title: "TODO B", taskType: "once", adopted: false },
		]);
	});
});
