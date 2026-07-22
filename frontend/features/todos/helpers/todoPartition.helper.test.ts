import { describe, expect, it } from "vitest";
import type { TaskType, Todo } from "../types";
import { partitionTodos } from "./todoPartition.helper";

function makeTodo(id: string, taskType: TaskType, completed: boolean): Todo {
	return {
		id,
		goalId: "goal-1",
		title: id,
		taskType,
		completed,
		completionCount: 0,
		isAiGenerated: false,
		createdAt: "2026-01-01T00:00:00.000Z",
	};
}

describe("partitionTodos", () => {
	it("空配列の場合、両方空を返す", () => {
		expect(partitionTodos([])).toEqual({ activeTodos: [], completedOnceTodos: [] });
	});

	it("完了済みの once だけを completedOnceTodos に振り分ける", () => {
		const onceDone = makeTodo("once-done", "once", true);
		const onceOpen = makeTodo("once-open", "once", false);
		const dailyDone = makeTodo("daily-done", "daily", true);
		const dailyOpen = makeTodo("daily-open", "daily", false);

		const result = partitionTodos([onceDone, onceOpen, dailyDone, dailyOpen]);

		expect(result.completedOnceTodos).toEqual([onceDone]);
		expect(result.activeTodos).toEqual([onceOpen, dailyDone, dailyOpen]);
	});

	it("完了済みの daily は activeTodos に残る", () => {
		const dailyDone = makeTodo("daily-done", "daily", true);
		const result = partitionTodos([dailyDone]);

		expect(result.activeTodos).toEqual([dailyDone]);
		expect(result.completedOnceTodos).toEqual([]);
	});

	it("元の並び順を保持する", () => {
		const a = makeTodo("a", "once", false);
		const b = makeTodo("b", "daily", false);
		const c = makeTodo("c", "once", false);

		const result = partitionTodos([a, b, c]);
		expect(result.activeTodos).toEqual([a, b, c]);
	});
});
