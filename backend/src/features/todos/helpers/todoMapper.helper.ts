import type { TodoResponse } from "../../../types/api";

export function mapTodoToResponse(
	todo: {
		id: string;
		goalId: string;
		milestoneId: string | null;
		title: string;
		description: string | null;
		dueDate: string | null;
		estimatedMinutes: number | null;
		priority: string;
		isCompleted: number;
		isAiGenerated: number;
		createdAt: string;
	},
	completionCount: number,
): TodoResponse {
	return {
		id: todo.id,
		goalId: todo.goalId,
		milestoneId: todo.milestoneId ?? undefined,
		title: todo.title,
		description: todo.description ?? undefined,
		dueDate: todo.dueDate ?? undefined,
		estimatedMinutes: todo.estimatedMinutes ?? undefined,
		priority: todo.priority,
		completed: todo.isCompleted === 1,
		completionCount,
		isAiGenerated: todo.isAiGenerated === 1,
		createdAt: todo.createdAt,
	};
}
