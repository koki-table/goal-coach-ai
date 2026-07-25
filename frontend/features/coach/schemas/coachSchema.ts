import { z } from "zod";

export const coachMessageInputSchema = z.object({
	content: z
		.string()
		.min(1, "メッセージを入力してください")
		.max(1000, "1000文字以内で入力してください"),
});

export type CoachMessageInput = z.infer<typeof coachMessageInputSchema>;
