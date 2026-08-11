import { buttonVariants } from "@/components/atom/button";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS } from "../config/marketingConfig";
import type { CtaTarget } from "../types";

type HeaderProps = {
	primaryCta: CtaTarget;
	logoHref: string;
};

export function Header({ primaryCta, logoHref }: HeaderProps) {
	return (
		<header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
			<div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 md:px-6">
				<Link href={logoHref} className="flex items-center gap-2">
					<Image
						src="/penguin-icon.png"
						alt={APP_NAME}
						width={28}
						height={28}
						className="rounded-full"
					/>
					<span className="font-bold">{APP_NAME}</span>
				</Link>

				<nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
					{NAV_LINKS.map((link) => (
						<a key={link.href} href={link.href} className="hover:text-foreground">
							{link.label}
						</a>
					))}
				</nav>

				<Link
					href={primaryCta.href}
					className={cn(buttonVariants({ variant: "default" }), "ml-auto")}
				>
					{primaryCta.label}
				</Link>
			</div>
		</header>
	);
}
