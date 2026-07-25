"use client";

import { Button } from "@/components/atom/button";
import { Textarea } from "@/components/atom/textarea";
import { useState } from "react";
import { MESSAGE_MAX_LENGTH } from "../config/coachConfig";
import { coachMessageInputSchema } from "../schemas/coachSchema";

type ChatInputBarProps = {
	onSend: (content: string) => Promise<boolean>;
	disabled?: boolean;
};

export function ChatInputBar({ onSend, disabled = false }: ChatInputBarProps) {
	const [value, setValue] = useState("");

	const handleSend = async () => {
		const content = value.trim();
		// 送信前にサーバーと同じ制約（1〜1000文字）でクライアント側バリデーションする
		if (!coachMessageInputSchema.safeParse({ content }).success) return;
		setValue("");
		// 送信失敗時は入力内容を失わないよう復元する
		const ok = await onSend(content);
		if (!ok) setValue(content);
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
				maxLength={MESSAGE_MAX_LENGTH}
				className="min-h-[44px] resize-none"
			/>
			<Button type="button" onClick={handleSend} disabled={disabled || value.trim().length === 0}>
				送信
			</Button>
		</div>
	);
}
