"use client";

import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChatsCircle, CheckSquare, SquaresFour, Target } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const iconMap = {
	SquaresFour,
	Target,
	CheckSquare,
	ChatsCircle,
} as const;

type SidebarProps = {
	onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
	const pathname = usePathname();

	return (
		<nav className="flex flex-col gap-1 p-4">
			{NAV_ITEMS.map((item) => {
				const Icon = iconMap[item.icon as keyof typeof iconMap];
				const isActive = pathname === item.href;

				return (
					<Link
						key={item.href}
						href={item.href}
						onClick={onNavigate}
						className={cn(
							"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
							isActive
								? "bg-sidebar-accent text-sidebar-accent-foreground"
								: "text-sidebar-foreground hover:bg-sidebar-accent/50",
						)}
					>
						<Icon className="h-4 w-4" />
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}
