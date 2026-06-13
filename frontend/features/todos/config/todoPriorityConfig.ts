import type { TodoPriority } from "../types";

type PriorityConfig = {
	label: string;
	className: string;
};

export const todoPriorityConfig: Record<TodoPriority, PriorityConfig> = {
	high: {
		label: "高",
		className: "bg-red-100 text-red-700 border-red-200",
	},
	medium: {
		label: "中",
		className: "bg-orange-100 text-orange-700 border-orange-200",
	},
	low: {
		label: "低",
		className: "bg-blue-100 text-blue-700 border-blue-200",
	},
};
