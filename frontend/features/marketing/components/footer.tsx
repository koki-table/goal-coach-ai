import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import { FOOTER_LINK_COLUMNS } from "../config/marketingConfig";

export function Footer() {
	return (
		<footer className="border-t border-border bg-background py-12">
			<div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3 md:px-6">
				<div className="flex items-center gap-2">
					<Image
						src="/penguin-icon.png"
						alt={APP_NAME}
						width={24}
						height={24}
						className="rounded-full"
					/>
					<span className="font-bold">{APP_NAME}</span>
				</div>

				{FOOTER_LINK_COLUMNS.map((column) => (
					<div key={column.heading}>
						<p className="text-sm font-semibold">{column.heading}</p>
						<ul className="mt-3 space-y-2">
							{column.links.map((link) => (
								<li key={link.label}>
									<a
										href={link.href}
										className="text-sm text-muted-foreground hover:text-foreground"
									>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</div>
				))}
			</div>

			<p className="mt-10 text-center text-xs text-muted-foreground">© 2026 {APP_NAME}</p>
		</footer>
	);
}
