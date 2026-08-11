import { cn } from "@/lib/utils";

type FloatingBadgeProps = {
	label: string;
	value: string;
	className?: string;
};

export function FloatingBadge({ label, value, className }: FloatingBadgeProps) {
	return (
		<div
			className={cn(
				"absolute rounded-xl border border-border bg-card px-4 py-2 shadow-lg",
				className,
			)}
		>
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="text-lg font-bold text-primary">{value}</p>
		</div>
	);
}
