import type { Todo } from "../types";

type PartitionedTodos = {
	// メインリストに表示するTODO（未完了、および完了済みの daily を含む）
	activeTodos: Todo[];
	// 完了済みの once（「完了済み」セクションに移動）
	completedOnceTodos: Todo[];
};

// once かつ完了 → completedOnceTodos、それ以外（daily の完了含む）→ activeTodos に振り分ける
export function partitionTodos(todos: Todo[]): PartitionedTodos {
	const isCompletedOnce = (todo: Todo) => todo.taskType === "once" && todo.completed;

	return {
		activeTodos: todos.filter((todo) => !isCompletedOnce(todo)),
		completedOnceTodos: todos.filter(isCompletedOnce),
	};
}
