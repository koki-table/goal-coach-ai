import { describe, expect, it } from "vitest";
import {
	getCategoryKeyFromName,
	getCategoryNameFromKey,
	mapGoalToResponse,
} from "./categoryMapping.helper";

describe("categoryMapping helper", () => {
	describe("getCategoryNameFromKey", () => {
		it("maps study to 学習", () => {
			expect(getCategoryNameFromKey("study")).toBe("学習");
		});

		it("maps career to 仕事", () => {
			expect(getCategoryNameFromKey("career")).toBe("仕事");
		});

		it("maps health to 健康", () => {
			expect(getCategoryNameFromKey("health")).toBe("健康");
		});

		it("maps skill to スキル", () => {
			expect(getCategoryNameFromKey("skill")).toBe("スキル");
		});

		it("maps finance to 財務", () => {
			expect(getCategoryNameFromKey("finance")).toBe("財務");
		});

		it("maps other to その他", () => {
			expect(getCategoryNameFromKey("other")).toBe("その他");
		});
	});

	describe("getCategoryKeyFromName", () => {
		it("maps 学習 to study", () => {
			expect(getCategoryKeyFromName("学習")).toBe("study");
		});

		it("maps 仕事 to career", () => {
			expect(getCategoryKeyFromName("仕事")).toBe("career");
		});

		it("returns other for unknown names", () => {
			expect(getCategoryKeyFromName("unknown")).toBe("other");
		});
	});

	describe("mapGoalToResponse", () => {
		it("maps goal with category to response", () => {
			const goal = {
				id: "goal-1",
				title: "Learn TypeScript",
				description: "Study advanced TS",
				dueDate: "2026-12-01",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapGoalToResponse(goal, "学習");

			expect(result).toEqual({
				id: "goal-1",
				title: "Learn TypeScript",
				description: "Study advanced TS",
				deadline: "2026-12-01",
				category: "study",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			});
		});

		it("maps goal with null description to undefined", () => {
			const goal = {
				id: "goal-1",
				title: "Test",
				description: null,
				dueDate: "2026-12-01",
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapGoalToResponse(goal, "学習");
			expect(result.description).toBeUndefined();
		});

		it("maps goal with null category to other", () => {
			const goal = {
				id: "goal-1",
				title: "Test",
				description: null,
				dueDate: null,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			};

			const result = mapGoalToResponse(goal, null);
			expect(result.category).toBe("other");
			expect(result.deadline).toBe("");
		});
	});
});
