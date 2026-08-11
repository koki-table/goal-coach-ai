import { cn } from "@/lib/utils";
import { todoPriorityConfig } from "../config/todoPriorityConfig";
import type { TodoPriority } from "../types";

type TodoPriorityBadgeProps = {
	priority: TodoPriority;
	className?: string;
};

export function TodoPriorityBadge({ priority, className }: TodoPriorityBadgeProps) {
	const config = todoPriorityConfig[priority];

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
