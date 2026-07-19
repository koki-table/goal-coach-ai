import { TooltipProvider } from "@/components/atom/tooltip";
import { SWRProvider } from "@/lib/swr/swrProvider";
import { jaJP } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Goal Coach AI",
	description: "AIコーチがあなたの目標達成を支援します",
};

const localization = {
	...jaJP,
	signIn: {
		...jaJP.signIn,
		start: {
			...jaJP.signIn?.start,
			title: "Goal Coach AI にログイン",
		},
	},
	signUp: {
		...jaJP.signUp,
		start: {
			...jaJP.signUp?.start,
			title: "Goal Coach AI に登録",
		},
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider localization={localization} afterSignOutUrl="/sign-in">
			<html lang="ja">
				<body className="min-h-screen antialiased">
					<SWRProvider>
						<TooltipProvider>{children}</TooltipProvider>
					</SWRProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
