import { AppShell } from "@/components/layout/appShell";

export default function AppLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <AppShell>{children}</AppShell>;
}
