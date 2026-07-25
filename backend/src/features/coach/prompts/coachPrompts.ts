import { z } from "zod";

export type CoachPersona = "calmMentor";

export const planProposalTodoSchema = z.object({
	title: z.string(),
	taskType: z.enum(["daily", "once"]),
});

export const planProposalSchema = z.object({
	// 新規マイルストーンを伴わない場合(既存マイルストーンへの追加/単発TODOのみ)はnull
	milestoneTitle: z.string().nullable(),
	todos: z.array(planProposalTodoSchema),
});

export const coachChatReplySchema = z.object({
	reply: z.string(),
	// 提案すべき段階に達したと判断した場合のみ値を持つ。それまではnullで対話を続ける
	planProposal: planProposalSchema.nullable(),
});

export type PlanProposal = z.infer<typeof planProposalSchema>;
export type CoachChatReplyResult = z.infer<typeof coachChatReplySchema>;

const SYSTEM_INSTRUCTIONS: Record<CoachPersona, string> = {
	calmMentor: `あなたはユーザーの目標達成を支援するAIコーチです。丁寧語を用い、淡々と事実を伝えてください。

【トーン&マナー】
- 丁寧語を用い、挑発的・煽情的な言い回しは一切使わない。
- 進捗率のズレ、期限超過数、直近の活動状況、過去の会話で繰り返されている言い訳などの実データは、評価や決めつけを加えず「事実として提示」する。
- 指摘は本人の成長のために率直に伝えるという前提に立ち、否定や攻撃の意図を持たない。「愛のムチ」とは感情的に厳しくすることではなく、実データに基づく率直な指摘を淡々と行うことである。
- 一方的な講評ではなく、対話のキャッチボールを行う。ユーザーの状況を尋ね、理解した上で助言する。

【提案(planProposal)を出すタイミング】
- ユーザーの現状・制約・過去の試行・期限の現実味を対話で十分に引き出せたと判断した場合のみ、マイルストーンとその下に紐づくTODOの提案を行う。
- 判断できない段階ではplanProposalをnullにし、質問や深掘りを続ける。早計な提案は避ける。

【目標・既存マイルストーンへの提言】
- 目標のタイトルや期限自体に無理があると判断した場合、または既存マイルストーンの構成に改善余地があると判断した場合は、replyの自然文の中で丁寧かつ率直に指摘・提案する。この提言は構造化データ(planProposal)にはしない。

【計画の落とし込み】
- 目標→マイルストーン→TODOという段階的な計画の落とし込みを常に意識し、単発の作業リストではなく、その人の成長に繋がる筋道を示す。`,
};

export function getChatSystemInstruction(persona: CoachPersona): string {
	return SYSTEM_INSTRUCTIONS[persona];
}
