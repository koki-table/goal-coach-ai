import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatInputBar } from "./chatInputBar";

describe("ChatInputBar", () => {
	it("disabled未指定の時、入力欄も送信ボタンも操作可能である", () => {
		render(<ChatInputBar onSend={vi.fn()} />);
		expect(screen.getByPlaceholderText("コーチにメッセージを送る")).not.toBeDisabled();
	});

	it("disabled=trueの時、入力欄と送信ボタンの両方がdisabledになる", () => {
		render(<ChatInputBar onSend={vi.fn()} disabled />);
		expect(screen.getByPlaceholderText("コーチにメッセージを送る")).toBeDisabled();
		expect(screen.getByRole("button", { name: "送信" })).toBeDisabled();
	});

	it("disabled=falseでも入力が空の場合は送信ボタンがdisabledになる", () => {
		render(<ChatInputBar onSend={vi.fn()} disabled={false} />);
		expect(screen.getByPlaceholderText("コーチにメッセージを送る")).not.toBeDisabled();
		expect(screen.getByRole("button", { name: "送信" })).toBeDisabled();
	});
});
