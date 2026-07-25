import { z } from "zod";
import { MESSAGE_MAX_LENGTH, MESSAGE_MIN_LENGTH } from "../config/coachConfig";

export const coachMessageInputSchema = z.object({
	content: z
		.string()
		.min(MESSAGE_MIN_LENGTH, "メッセージを入力してください")
		.max(MESSAGE_MAX_LENGTH, `${MESSAGE_MAX_LENGTH}文字以内で入力してください`),
});

export type CoachMessageInput = z.infer<typeof coachMessageInputSchema>;
