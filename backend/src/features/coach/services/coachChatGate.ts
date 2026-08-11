import { CoachMessageRepository } from "../../../common/repositories/coachMessageRepository";
import { SubscriptionRepository } from "../../../common/repositories/subscriptionRepository";
import type { Database } from "../../../db";
import { COACH_MODEL_FREE, COACH_MODEL_PRO } from "../config/coachModelConfig";

export type CoachChatGateResult = {
	modelId: string;
	blocked: boolean;
};

// tier-aware課金ゲート。objectiveStatus="decided"(通常スレッド)のみカウント・制限する。
// "undecided"(探索スレッド)は常に無制限(1ユーザー1本のDB制約で低ボリュームなため)
export class CoachChatGate {
	// free tier: decided会話の1日あたり上限。超過でブロックする
	private static readonly FREE_DAILY_DECIDED_LIMIT = 3;
	// pro tier: decided会話の1日あたりソフトリミット。超過してもブロックせず
	// COACH_MODEL_FREEへ自動ダウングレードする("無制限"訴求を守りつつコストを抑える)
	private static readonly PRO_DAILY_DECIDED_SOFT_LIMIT = 100;

	private subscriptionRepo: SubscriptionRepository;
	private messageRepo: CoachMessageRepository;

	constructor(db: Database) {
		this.subscriptionRepo = new SubscriptionRepository(db);
		this.messageRepo = new CoachMessageRepository(db);
	}

	async resolveForDecidedMessage(userId: string, sinceIso: string): Promise<CoachChatGateResult> {
		const subscription = await this.subscriptionRepo.findByUserId(userId);
		const tier = subscription?.tier ?? "free";
		const decidedCountToday = await this.messageRepo.countUserMessagesByUserIdSince(
			userId,
			sinceIso,
			"decided",
		);

		if (tier === "free") {
			return {
				modelId: COACH_MODEL_FREE,
				blocked: decidedCountToday >= CoachChatGate.FREE_DAILY_DECIDED_LIMIT,
			};
		}

		const modelId =
			decidedCountToday >= CoachChatGate.PRO_DAILY_DECIDED_SOFT_LIMIT
				? COACH_MODEL_FREE
				: COACH_MODEL_PRO;
		return { modelId, blocked: false };
	}

	// 探索スレッドは常に無制限・非カウント。tierに応じたモデルのみ返す
	async resolveForUndecidedMessage(userId: string): Promise<string> {
		const subscription = await this.subscriptionRepo.findByUserId(userId);
		const tier = subscription?.tier ?? "free";
		return tier === "pro" ? COACH_MODEL_PRO : COACH_MODEL_FREE;
	}
}
