import { TYPING_INDICATOR_DOT_DELAYS_MS } from "../config/coachConfig";

export function TypingIndicator() {
	return (
		<output className="flex items-center gap-1" aria-label="AIコーチが入力中">
			{TYPING_INDICATOR_DOT_DELAYS_MS.map((delayMs) => (
				<span
					key={delayMs}
					className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70"
					style={{ animationDelay: `${delayMs}ms` }}
				/>
			))}
		</output>
	);
}
