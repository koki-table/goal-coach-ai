"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/constants";
import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

type AppShellProps = {
	children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="flex min-h-screen">
			{/* Desktop Sidebar */}
			<aside className="hidden md:flex md:w-60 md:flex-col md:border-r bg-sidebar">
				<div className="flex h-14 items-center border-b px-4">
					<span className="text-lg">⚔️</span>
					<span className="ml-2 font-bold text-sidebar-foreground">{APP_NAME}</span>
				</div>
				<Sidebar />
			</aside>

			{/* Mobile Sidebar */}
			<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
				<SheetContent side="left" className="w-60 bg-sidebar p-0">
					<SheetTitle className="flex h-14 items-center border-b px-4">
						<span className="text-lg">⚔️</span>
						<span className="ml-2 font-bold text-sidebar-foreground">{APP_NAME}</span>
					</SheetTitle>
					<Sidebar onNavigate={() => setMobileOpen(false)} />
				</SheetContent>
			</Sheet>

			{/* Main Area */}
			<div className="flex flex-1 flex-col">
				<Header onMenuClick={() => setMobileOpen(true)} />
				<main className="flex-1 p-4 md:p-6">{children}</main>
			</div>
		</div>
	);
}
