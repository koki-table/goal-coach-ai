import { AppShell } from "@/components/layout/appShell";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Goal Coach AI",
	description: "AI軍曹があなたの目標達成を支援します",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ja" className={`${geistSans.variable} ${geistMono.variable}`}>
			<body className="min-h-screen antialiased">
				<TooltipProvider>
					<AppShell>{children}</AppShell>
				</TooltipProvider>
			</body>
		</html>
	);
}
