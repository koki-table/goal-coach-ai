import { describe, expect, it } from "vitest";
import { summarizeEpisodes } from "./coachSummary.helper";

describe("coachSummary helper", () => {
	describe("summarizeEpisodes", () => {
		it("returns zeroed summary with no episodes", () => {
			const result = summarizeEpisodes([]);

			expect(result).toEqual({
				episodeCount: 0,
				isStagnant: false,
				progressDeltaSinceOldest: 0,
			});
		});

		it("is not stagnant with a single episode", () => {
			const result = summarizeEpisodes([
				{
					createdAt: "2026-07-22T00:00:00.000Z",
					progressPercent: 30,
					memo: null,
					obstacles: null,
					feedback: "x",
				},
			]);

			expect(result.episodeCount).toBe(1);
			expect(result.isStagnant).toBe(false);
		});

		it("detects stagnation when progress is unchanged across episodes (newest first)", () => {
			const result = summarizeEpisodes([
				{
					createdAt: "2026-07-22T00:00:00.000Z",
					progressPercent: 30,
					memo: "忙しい",
					obstacles: null,
					feedback: "x",
				},
				{
					createdAt: "2026-07-18T00:00:00.000Z",
					progressPercent: 30,
					memo: "残業",
					obstacles: null,
					feedback: "y",
				},
			]);

			expect(result.isStagnant).toBe(true);
			expect(result.progressDeltaSinceOldest).toBe(0);
		});

		it("is not stagnant when progress increased", () => {
			const result = summarizeEpisodes([
				{
					createdAt: "2026-07-22T00:00:00.000Z",
					progressPercent: 45,
					memo: null,
					obstacles: null,
					feedback: "x",
				},
				{
					createdAt: "2026-07-18T00:00:00.000Z",
					progressPercent: 30,
					memo: null,
					obstacles: null,
					feedback: "y",
				},
			]);

			expect(result.isStagnant).toBe(false);
			expect(result.progressDeltaSinceOldest).toBe(15);
		});
	});
});
