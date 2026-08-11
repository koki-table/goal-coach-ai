import { cn } from "@/lib/utils";
import { todoTaskTypeConfig } from "../config/todoTaskTypeConfig";
import type { TaskType } from "../types";

type TodoTaskTypeBadgeProps = {
	taskType: TaskType;
	className?: string;
};

export function TodoTaskTypeBadge({ taskType, className }: TodoTaskTypeBadgeProps) {
	// daily のみバッジ表示（once は通常タスクなので何も描画しない）
	if (taskType !== "daily") {
		return null;
	}

	const config = todoTaskTypeConfig[taskType];

	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-xs font-medium",
				config.className,
				className,
			)}
		>
			{config.label}
		</span>
	);
}
