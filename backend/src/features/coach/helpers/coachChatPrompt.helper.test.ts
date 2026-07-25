import { describe, expect, it } from "vitest";
import { buildChatUserPrompt } from "./coachChatPrompt.helper";

describe("buildChatUserPrompt", () => {
	it("includes goal snapshot and milestones when the goal is alive", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeadline: "2026-12-31",
			goalDeleted: false,
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
			history: [{ role: "user", content: "最近全然進んでいません" }],
		});

		expect(prompt).toContain("TOEIC800点を取る");
		expect(prompt).toContain("実データに基づく進捗率: 30%");
		expect(prompt).toContain("[未完了] 文法基礎を固める");
		expect(prompt).toContain("[ユーザー] 最近全然進んでいません");
	});

	it("shows a deleted-goal notice and omits snapshot when the goal has been deleted", () => {
		const prompt = buildChatUserPrompt({
			goalTitle: "TOEIC800点を取る",
			goalDeadline: "2026-12-31",
			goalDeleted: true,
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
			milestones: [],
			history: [],
		});

		expect(prompt).toContain("(マイルストーンなし)");
	});
});
