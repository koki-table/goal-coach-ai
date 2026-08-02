import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TYPING_INDICATOR_DOT_DELAYS_MS } from "../config/coachConfig";
import { TypingIndicator } from "./typingIndicator";

describe("TypingIndicator", () => {
	it("role=statusでレンダリングされる", () => {
		render(<TypingIndicator />);
		expect(screen.getByRole("status", { name: "AIコーチが入力中" })).toBeInTheDocument();
	});

	it("ドットの数がTYPING_INDICATOR_DOT_DELAYS_MSと一致する", () => {
		render(<TypingIndicator />);
		const status = screen.getByRole("status");
		expect(status.children).toHaveLength(TYPING_INDICATOR_DOT_DELAYS_MS.length);
	});

	it("各ドットがanimate-bounceクラスを持つ", () => {
		render(<TypingIndicator />);
		const status = screen.getByRole("status");
		for (const dot of Array.from(status.children)) {
			expect(dot).toHaveClass("animate-bounce");
		}
	});

	it("色はハードコードでなくデザイントークン(bg-muted-foreground)経由である", () => {
		render(<TypingIndicator />);
		const status = screen.getByRole("status");
		for (const dot of Array.from(status.children)) {
			expect(dot.className).toContain("bg-muted-foreground");
		}
	});
});
