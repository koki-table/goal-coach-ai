import { describe, expect, it } from "vitest";
import { mapCoachEvaluationToHistoryItem } from "./coachEvaluationMapper.helper";

describe("coachEvaluationMapper helper", () => {
	describe("mapCoachEvaluationToHistoryItem", () => {
		it("maps DB evaluation to history item, converting null to undefined", () => {
			const evaluation = {
				id: "eval-1",
				persona: "harsh",
				progressPercent: 30,
				memo: null,
				obstacles: null,
				feedback: "進捗が遅れている",
				successRate: 40,
				suggestions: ["A社に連絡する", "資料を作成する"],
				createdAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapCoachEvaluationToHistoryItem(evaluation);

			expect(result).toEqual({
				id: "eval-1",
				persona: "harsh",
				progressPercent: 30,
				memo: undefined,
				obstacles: undefined,
				feedback: "進捗が遅れている",
				successRate: 40,
				suggestions: ["A社に連絡する", "資料を作成する"],
				createdAt: "2026-01-01T00:00:00.000Z",
			});
		});

		it("passes through memo and obstacles when present", () => {
			const evaluation = {
				id: "eval-2",
				persona: "harsh",
				progressPercent: 80,
				memo: "順調に進んでいる",
				obstacles: "時間が足りない",
				feedback: "よくやっている",
				successRate: 85,
				suggestions: [],
				createdAt: "2026-01-02T00:00:00.000Z",
			};

			const result = mapCoachEvaluationToHistoryItem(evaluation);

			expect(result.memo).toBe("順調に進んでいる");
			expect(result.obstacles).toBe("時間が足りない");
			expect(result.suggestions).toEqual([]);
		});
	});
});
