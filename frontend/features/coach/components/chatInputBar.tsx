"use client";

import { Button } from "@/components/atom/button";
import { Textarea } from "@/components/atom/textarea";
import { useState } from "react";

type ChatInputBarProps = {
	onSend: (content: string) => Promise<void>;
	disabled?: boolean;
};

export function ChatInputBar({ onSend, disabled = false }: ChatInputBarProps) {
	const [value, setValue] = useState("");

	const handleSend = async () => {
		const content = value.trim();
		if (!content) return;
		setValue("");
		await onSend(content);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// IME変換確定時のEnterはisComposing/keyCode===229になる。送信と誤認しないよう除外する。
		if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="flex items-end gap-2 border-t p-3">
			<Textarea
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="コーチにメッセージを送る"
				disabled={disabled}
				className="min-h-[44px] resize-none"
			/>
			<Button type="button" onClick={handleSend} disabled={disabled || value.trim().length === 0}>
				送信
			</Button>
		</div>
	);
}
