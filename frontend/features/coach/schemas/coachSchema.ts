import { z } from "zod";

export const coachEvaluateInputSchema = z.object({
	goalId: z.string().min(1, "目標を選択してください"),
	progressPercent: z
		.number()
		.int("進捗率は整数で入力してください")
		.min(0, "進捗率は0%以上で入力してください")
		.max(100, "進捗率は100%以下で入力してください"),
	memo: z.string().max(1000, "メモは1000文字以内で入力してください").optional(),
	obstacles: z.string().max(500, "障害事項は500文字以内で入力してください").optional(),
});

export type CoachEvaluateInput = z.infer<typeof coachEvaluateInputSchema>;
