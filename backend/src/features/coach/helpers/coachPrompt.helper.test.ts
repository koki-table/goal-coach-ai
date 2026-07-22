import { describe, expect, it } from "vitest";
import { buildUserPrompt } from "./coachPrompt.helper";

const BASE_SNAPSHOT = {
	realProgressPercent: 40,
	totalTodos: 5,
	completedTodos: 2,
	totalMilestones: 2,
	completedMilestones: 1,
	overdueTodosCount: 1,
	lastActivityAt: "2026-07-20T00:00:00.000Z",
	completedLast7Days: 1,
	minutesSpentLast7Days: 30,
};

describe("coachPrompt helper", () => {
	describe("buildUserPrompt", () => {
		it("wraps goal data in a <goal_data> XML tag", () => {
			const prompt = buildUserPrompt({
				goal: { title: "TOEIC900点", deadline: "2026-12-31" },
				milestones: [],
				snapshot: BASE_SNAPSHOT,
				selfReportedProgressPercent: 50,
				recentEpisodes: [],
			});

			expect(prompt).toContain("<goal_data>");
			expect(prompt).toContain("</goal_data>");
			expect(prompt).toContain("TOEIC900点");
			expect(prompt).toContain("2026-12-31");
			expect(prompt).toContain("自己申告の進捗率: 50%");
			expect(prompt).toContain("実データに基づく進捗率: 40%");
		});

		it("lists milestones with completion status", () => {
			const prompt = buildUserPrompt({
				goal: { title: "目標", deadline: null },
				milestones: [
					{ title: "文法書を1周する", isCompleted: true },
					{ title: "模試を受ける", isCompleted: false },
				],
				snapshot: BASE_SNAPSHOT,
				selfReportedProgressPercent: 50,
				recentEpisodes: [],
			});

			expect(prompt).toContain("[完了] 文法書を1周する");
			expect(prompt).toContain("[未完了] 模試を受ける");
		});

		it("falls back to placeholder text when there are no milestones or episodes", () => {
			const prompt = buildUserPrompt({
				goal: { title: "目標", deadline: null },
				milestones: [],
				snapshot: BASE_SNAPSHOT,
				selfReportedProgressPercent: 0,
				recentEpisodes: [],
			});

			expect(prompt).toContain("(マイルストーンなし)");
			expect(prompt).toContain("(過去の評価履歴なし)");
		});

		it("includes recent episodes for the pseudo-hybrid memory", () => {
			const prompt = buildUserPrompt({
				goal: { title: "目標", deadline: null },
				milestones: [],
				snapshot: BASE_SNAPSHOT,
				selfReportedProgressPercent: 30,
				recentEpisodes: [
					{
						createdAt: "2026-07-18T00:00:00.000Z",
						progressPercent: 30,
						memo: "残業で疲れた",
						obstacles: null,
						feedback: "また言い訳か",
					},
				],
			});

			expect(prompt).toContain("<recent_episodes>");
			expect(prompt).toContain("残業で疲れた");
			expect(prompt).toContain("また言い訳か");
		});

		it("defaults memo and obstacles display to なし when absent", () => {
			const prompt = buildUserPrompt({
				goal: { title: "目標", deadline: null },
				milestones: [],
				snapshot: BASE_SNAPSHOT,
				selfReportedProgressPercent: 0,
				recentEpisodes: [],
			});

			expect(prompt).toContain("ユーザーのメモ: なし");
			expect(prompt).toContain("ユーザーが挙げた障害事項: なし");
		});
	});
});
