"use client";

import { Button } from "@/components/atom/button";
import { UserMenu } from "@/components/layout/userMenu";
import { List, SidebarSimple } from "@phosphor-icons/react";

type HeaderProps = {
	onMenuClick: () => void;
	onToggleSidebar: () => void;
	sidebarOpen: boolean;
};

export function Header({ onMenuClick, onToggleSidebar, sidebarOpen }: HeaderProps) {
	return (
		<header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
			{/* Mobile: ハンバーガーメニュー */}
			<Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
				<List className="h-5 w-5" />
				<span className="sr-only">メニューを開く</span>
			</Button>

			{/* Desktop: サイドバー開閉ボタン */}
			<Button variant="ghost" size="icon" className="hidden md:flex" onClick={onToggleSidebar}>
				<SidebarSimple className="h-5 w-5" />
				<span className="sr-only">{sidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}</span>
			</Button>

			<div className="ml-auto">
				<UserMenu />
			</div>
		</header>
	);
}
