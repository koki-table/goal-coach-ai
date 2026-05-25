"use client";

import { Button } from "@/components/atom/button";
import { UserMenu } from "@/components/layout/userMenu";
import { APP_NAME } from "@/lib/constants";
import { List } from "@phosphor-icons/react";

type HeaderProps = {
	onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
	return (
		<header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
			<Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
				<List className="h-5 w-5" />
				<span className="sr-only">メニューを開く</span>
			</Button>

			<div className="flex items-center gap-2">
				<span className="text-lg">⚔️</span>
				<h1 className="text-lg font-bold text-foreground">{APP_NAME}</h1>
			</div>

			<div className="ml-auto">
				<UserMenu />
			</div>
		</header>
	);
}
