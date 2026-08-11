import { describe, expect, it } from "vitest";
import { buildDailyReviewPrompt } from "./dailyReviewPrompt.helper";
import type { GoalSnapshot } from "./goalSnapshot.helper";

const SNAPSHOT: GoalSnapshot = {
	realProgressPercent: 42,
	totalTodos: 10,
	completedTodos: 4,
	totalMilestones: 2,
	completedMilestones: 1,
	overdueTodosCount: 3,
	lastActivityAt: "2026-08-10T00:00:00.000Z",
	completedLast7Days: 5,
	minutesSpentLast7Days: 120,
};

describe("buildDailyReviewPrompt", () => {
	it("目標データ・snapshotの値をプロンプトに埋め込む", () => {
		const prompt = buildDailyReviewPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeadline: "2026-12-31",
			today: "2026-08-11",
			snapshot: SNAPSHOT,
			milestones: [],
			existingTodoTitles: [],
		});

		expect(prompt).toContain("TOEIC800点を取る");
		expect(prompt).toContain("2026-12-31");
		expect(prompt).toContain("2026-08-11");
		expect(prompt).toContain("42%");
		expect(prompt).toContain("TODO 4/10件");
		expect(prompt).toContain("主要な成果 1/2件");
		expect(prompt).toContain("期限超過中のTODO数: 3件");
		expect(prompt).toContain("直近7日間の完了数: 5件");
		expect(prompt).toContain("作業時間: 120分");
	});

	it("達成期限未設定の場合は「未設定」と表示する", () => {
		const prompt = buildDailyReviewPrompt({
			goalTitle: "資格取得",
			goalDeadline: null,
			today: "2026-08-11",
			snapshot: SNAPSHOT,
			milestones: [],
			existingTodoTitles: [],
		});
		expect(prompt).toContain("達成期限: 未設定");
	});

	it("未完了milestoneのidと測定値をプロンプトに含める(AIがmilestoneUpdatesで参照するため)", () => {
		const prompt = buildDailyReviewPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeadline: "2026-12-31",
			today: "2026-08-11",
			snapshot: SNAPSHOT,
			milestones: [
				{
					id: "m1",
					title: "模試900点",
					startValue: 0,
					currentValue: 500,
					targetValue: 900,
					unit: "点",
				},
			],
			existingTodoTitles: [],
		});
		expect(prompt).toContain("milestoneId: m1");
		expect(prompt).toContain("模試900点");
		expect(prompt).toContain("現在値: 500点");
		expect(prompt).toContain("目標値: 900点");
	});

	it("milestonesが空の場合は「未完了の主要な成果なし」と表示する", () => {
		const prompt = buildDailyReviewPrompt({
			goalTitle: "資格取得",
			goalDeadline: null,
			today: "2026-08-11",
			snapshot: SNAPSHOT,
			milestones: [],
			existingTodoTitles: [],
		});
		expect(prompt).toContain("(未完了の主要な成果なし)");
	});

	it("既存TODOタイトルを重複提案抑止のためプロンプトに含める", () => {
		const prompt = buildDailyReviewPrompt({
			goalTitle: "資格取得",
			goalDeadline: null,
			today: "2026-08-11",
			snapshot: SNAPSHOT,
			milestones: [],
			existingTodoTitles: ["過去問を1日1回演習する"],
		});
		expect(prompt).toContain("過去問を1日1回演習する");
	});

	it("既存TODOが空の場合は「既存TODOなし」と表示する", () => {
		const prompt = buildDailyReviewPrompt({
			goalTitle: "資格取得",
			goalDeadline: null,
			today: "2026-08-11",
			snapshot: SNAPSHOT,
			milestones: [],
			existingTodoTitles: [],
		});
		expect(prompt).toContain("(既存TODOなし)");
	});
});
