import { describe, expect, it } from "vitest";
import { buildChatUserPrompt } from "./coachChatPrompt.helper";

describe("buildChatUserPrompt", () => {
	it("includes goal snapshot and milestones when the goal is alive", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeadline: "2026-12-31",
			goalDeleted: false,
			today: "2026-08-05",
			snapshot: {
				realProgressPercent: 30,
				totalTodos: 10,
				completedTodos: 3,
				totalMilestones: 2,
				completedMilestones: 0,
				overdueTodosCount: 1,
				lastActivityAt: "2026-07-01T00:00:00.000Z",
				completedLast7Days: 1,
				minutesSpentLast7Days: 60,
			},
			milestones: [{ title: "文法基礎を固める", isCompleted: false }],
			todos: [{ title: "毎日30分学習する", taskType: "daily", isCompleted: false }],
			history: [{ role: "user", content: "最近全然進んでいません" }],
		});

		expect(prompt).toContain("TOEIC800点を取る");
		expect(prompt).toContain("実データに基づく進捗率: 30%");
		expect(prompt).toContain("[未完了] 文法基礎を固める");
		expect(prompt).toContain("[毎日/未完了] 毎日30分学習する");
		expect(prompt).toContain("[ユーザー] 最近全然進んでいません");
	});

	it("shows a placeholder when there are no existing todos", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeleted: false,
			today: "2026-08-05",
			milestones: [],
			history: [],
		});

		expect(prompt).toContain("(既存TODOなし)");
	});

	it("includes today's date so the LLM does not guess a deadline", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeleted: false,
			today: "2026-08-05",
			history: [],
		});

		expect(prompt).toContain("本日の日付: 2026-08-05");
	});

	it("includes today's date in the deleted-goal branch too", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeadline: "2026-12-31",
			goalDeleted: true,
			today: "2026-08-05",
			history: [],
		});

		expect(prompt).toContain("本日の日付: 2026-08-05");
	});

	it("shows a deleted-goal notice and omits snapshot when the goal has been deleted", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeadline: "2026-12-31",
			goalDeleted: true,
			today: "2026-08-05",
			history: [],
		});

		expect(prompt).toContain("この目標は削除済みです");
		expect(prompt).not.toContain("実データに基づく進捗率");
		expect(prompt).toContain("これが最初のメッセージです");
	});

	it("shows a placeholder when there are no milestones", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeleted: false,
			today: "2026-08-05",
			milestones: [],
			history: [],
		});

		expect(prompt).toContain("(主要な成果なし)");
	});

	it("notes that existing milestones are already confirmed and should not be re-proposed", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeleted: false,
			today: "2026-08-05",
			milestones: [{ title: "文法基礎を固める", isCompleted: false }],
			history: [],
		});

		expect(prompt).toContain("既に確定済みです");
		expect(prompt).toContain("新規の主要な成果として提案しないでください");
	});

	it("annotates past assistant proposals with their adoption state", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeleted: false,
			today: "2026-08-05",
			milestones: [],
			history: [
				{
					role: "assistant",
					content: "次のマイルストーンを提案します。",
					proposal: {
						objective: null,
						keyResults: [{ title: "基礎文法を習得する", adopted: true }],
						todos: [
							{ title: "毎日30分学習する", adopted: true },
							{ title: "参考書を1冊読み終える", adopted: false },
						],
						milestoneUpdates: [],
					},
				},
			],
		});

		expect(prompt).toContain("主要な成果(Key Result)『基礎文法を習得する』(採用済み)");
		expect(prompt).toContain("TODO『毎日30分学習する』(採用済み)");
		expect(prompt).toContain("TODO『参考書を1冊読み終える』(未採用)");
	});

	it("annotates an objective proposal with its adoption state", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "目標を決める相談",
			goalDeleted: false,
			today: "2026-08-05",
			milestones: [],
			history: [
				{
					role: "assistant",
					content: "この目標にしましょう。",
					proposal: {
						objective: { title: "資格を取得する", adopted: false },
						keyResults: [],
						todos: [],
						milestoneUpdates: [],
					},
				},
			],
		});

		expect(prompt).toContain("目標(Objective)『資格を取得する』(未採用)");
	});

	it("annotates a milestone update proposal with its adoption state", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeleted: false,
			today: "2026-08-05",
			milestones: [],
			history: [
				{
					role: "assistant",
					content: "現在のペースだと推定700点だ。",
					proposal: {
						objective: null,
						keyResults: [],
						todos: [],
						milestoneUpdates: [{ title: "模試900点", adopted: false }],
					},
				},
			],
		});

		expect(prompt).toContain("主要な成果の進捗推定『模試900点』(未採用)");
	});

	it("includes the active goal count in user_state when provided", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "目標を決める相談",
			goalDeleted: false,
			today: "2026-08-05",
			history: [],
			activeGoalCount: 2,
		});

		expect(prompt).toContain("<user_state>");
		expect(prompt).toContain("現在のactive(未完了)目標数: 2件");
	});

	it("omits the user_state block when activeGoalCount is not provided", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeleted: false,
			today: "2026-08-05",
			history: [],
		});

		expect(prompt).not.toContain("<user_state>");
	});

	it("includes the session_state block with the current phase when provided", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeleted: false,
			today: "2026-08-05",
			history: [],
			phase: "insight",
		});

		expect(prompt).toContain("<session_state>");
		expect(prompt).toContain("現在のphase: insight");
	});

	it("omits the session_state block when phase is not provided", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeleted: false,
			today: "2026-08-05",
			history: [],
		});

		expect(prompt).not.toContain("<session_state>");
	});
});
