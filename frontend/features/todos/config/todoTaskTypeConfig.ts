import type { TaskType } from "../types";

type TaskTypeConfig = {
	label: string;
	className: string;
};

// バッジは daily のみ表示する（once は通常タスクなのでバッジ不要）
export const todoTaskTypeConfig: Record<TaskType, TaskTypeConfig> = {
	daily: {
		label: "毎日",
		className: "bg-green-100 text-green-700 border-green-200",
	},
	once: {
		label: "一回のみ",
		className: "bg-gray-100 text-gray-700 border-gray-200",
	},
};
