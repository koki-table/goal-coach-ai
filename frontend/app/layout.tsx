import { TooltipProvider } from "@/components/atom/tooltip";
import { SWRProvider } from "@/lib/swr/swrProvider";
import { jaJP } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	metadataBase: new URL("https://goal-coach.app"),
	title: "AIコーチ ペンタ君",
	description: "AIコーチ ペンタ君があなたの目標達成を支援します",
};

const localization = {
	...jaJP,
	signIn: {
		...jaJP.signIn,
		start: {
			...jaJP.signIn?.start,
			title: "AIコーチ ペンタ君 にログイン",
		},
	},
	signUp: {
		...jaJP.signUp,
		start: {
			...jaJP.signUp?.start,
			title: "AIコーチ ペンタ君 に登録",
		},
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider
			localization={localization}
			afterSignOutUrl="/sign-in"
			appearance={{ theme: shadcn }}
		>
			<html lang="ja">
				<body className="min-h-dvh antialiased">
					<SWRProvider>
						<TooltipProvider>{children}</TooltipProvider>
					</SWRProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
