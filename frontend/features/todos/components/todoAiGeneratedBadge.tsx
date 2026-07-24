import { cn } from "@/lib/utils";
import { todoAiGeneratedConfig } from "../config/todoAiGeneratedConfig";

type TodoAiGeneratedBadgeProps = {
	isAiGenerated: boolean;
	className?: string;
};

export function TodoAiGeneratedBadge({ isAiGenerated, className }: TodoAiGeneratedBadgeProps) {
	if (!isAiGenerated) {
		return null;
	}

	return (
		<span
			className={cn(
				"inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium",
				todoAiGeneratedConfig.className,
				className,
			)}
		>
			{todoAiGeneratedConfig.label}
		</span>
	);
}
