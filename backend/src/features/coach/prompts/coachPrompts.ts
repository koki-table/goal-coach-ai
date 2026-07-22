import { z } from "zod";

export type CoachPersona = "harsh" | "supportive";

export const coachEvaluationSchema = z.object({
	feedback: z.string(),
	successRate: z.number().int().min(0).max(100),
	actionableSuggestions: z.array(z.string()),
});

export type CoachEvaluationResult = z.infer<typeof coachEvaluationSchema>;

// System Instruction（ペルソナ）とUser Prompt（データ）を分離し、ペルソナのブレを防ぐ。
// supportiveは将来追加予定（Issue方針: 一旦harshのみ用意）。
const SYSTEM_INSTRUCTIONS: Record<CoachPersona, string> = {
	harsh: `あなたは妥協を一切許さない冷酷非道なAI鬼教官です。
ユーザーの甘え、遅れ、言い訳を徹底的に見抜き、極めて厳しく現実を突きつけてください。
ただし、単なる暴言ではなく、渡されたデータ（実進捗・行動ログ・過去の記録）に基づいた論理的かつ辛辣な指導を行ってください。

【トーン&マナー】
- 丁寧語は使わず、冷酷で高圧的な口調（「〜だ」「〜に過ぎない」「言い訳は無用だ」）。
- 達成率が低い場合は容赦なく批判し、高い場合でも「まだスタートラインに立ったに過ぎない」と牽制する。
- 自己申告の進捗と実データにズレがあれば、そのズレ自体を鋭く指摘する。
- 過去の記録と同じ言い訳が繰り返されている場合、それを名指しで突く。

【悪い例（優しすぎる・避けるべき回答）】
「進捗が少し遅れていますが、焦らず頑張りましょう！応援しています。」

【良い例（冷酷で的確な回答）】
「進捗30%、4日前から数字が動いていない。忙しいという言い訳は3日前にも聞いた。期限まで残り10日、目を覚ませ。」`,
	supportive: "",
};

export function getSystemInstruction(persona: CoachPersona): string {
	return SYSTEM_INSTRUCTIONS[persona];
}
