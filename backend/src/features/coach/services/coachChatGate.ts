import { FREE_DAILY_DECIDED_LIMIT } from "../../../common/helpers/coachChatLimit.helper";
import { CoachDailyUsageRepository } from "../../../common/repositories/coachDailyUsageRepository";
import { SubscriptionRepository } from "../../../common/repositories/subscriptionRepository";
import type { Database } from "../../../db";
import { COACH_MODEL_FREE, COACH_MODEL_PRO } from "../config/coachModelConfig";

export type CoachChatGateResult = {
	modelId: string;
	blocked: boolean;
};

// tier-aware課金ゲート。objectiveStatus="decided"(通常スレッド)のみカウント・制限する。
// "undecided"(探索スレッド)は常に無制限(1ユーザー1本のDB制約で低ボリュームなため)。
//
// カウントはcoachDailyUsageテーブルへのatomic UPSERTで行う(coachDailyUsageRepository.ts
// 参照)。これは2つの既知の欠陥を修正するための設計:
// (1) 会話のobjectiveStatusを事後的にJOINして数える旧方式では、探索スレッドを
//     adoptObjective()でdecidedへ変換した瞬間、探索中に送った過去のメッセージまで
//     遡ってdecided扱いでカウントされ、無料ユーザーがオンボーディング直後に即429に
//     なるバグがあった。このテーブルは「実際にdecided状態で送信された時点」でのみ
//     incrementするため、事後的な遡及カウントが起きない。
// (2) 「チェックしてから書き込む」を別ステップで行うと並列リクエストでのTOCTOUレースが
//     発生する。incrementIfUnderLimitは1つのSQL文でincrementと上限チェックをatomicに
//     行うため、並列リクエストでも上限を超えて通過することがない。
export class CoachChatGate {
	// pro tier: decided会話の1日あたりソフトリミット。超過してもブロックせず
	// COACH_MODEL_FREEへ自動ダウングレードする("無制限"訴求を守りつつコストを抑える)
	private static readonly PRO_DAILY_DECIDED_SOFT_LIMIT = 100;

	private subscriptionRepo: SubscriptionRepository;
	private usageRepo: CoachDailyUsageRepository;

	constructor(db: Database) {
		this.subscriptionRepo = new SubscriptionRepository(db);
		this.usageRepo = new CoachDailyUsageRepository(db);
	}

	// decided会話への送信を許可判定しつつ、許可した分だけatomicにincrementする。
	// 呼び出しは「今回の送信を1件として記録してよいか」を意味するため、実際に送信する
	// 直前(コンテンツ検証後・LLM呼び出し前)に一度だけ呼ぶこと。呼ぶたびにincrementされる。
	async resolveForDecidedMessage(
		userId: string,
		todayIsoDate: string,
	): Promise<CoachChatGateResult> {
		const subscription = await this.subscriptionRepo.findByUserId(userId);
		const tier = subscription?.tier ?? "free";

		if (tier === "free") {
			const newCount = await this.usageRepo.incrementIfUnderLimit(
				userId,
				todayIsoDate,
				FREE_DAILY_DECIDED_LIMIT,
			);
			// newCount === undefined は上限到達によりincrementが適用されなかったことを意味する
			return { modelId: COACH_MODEL_FREE, blocked: newCount === undefined };
		}

		const newCount = await this.usageRepo.increment(userId, todayIsoDate);
		const modelId =
			newCount > CoachChatGate.PRO_DAILY_DECIDED_SOFT_LIMIT ? COACH_MODEL_FREE : COACH_MODEL_PRO;
		return { modelId, blocked: false };
	}

	// 探索スレッドは常に無制限・非カウント。tierに応じたモデルのみ返す
	async resolveForUndecidedMessage(userId: string): Promise<string> {
		const subscription = await this.subscriptionRepo.findByUserId(userId);
		const tier = subscription?.tier ?? "free";
		return tier === "pro" ? COACH_MODEL_PRO : COACH_MODEL_FREE;
	}

	// resolveForDecidedMessageで予約(increment)した1件を解放する。LLM呼び出しが失敗し
	// 実際にはメッセージが永続化されなかった場合に呼ぶこと(呼ばないと失敗するたびに
	// 残り回数が実際より早く減っていく)
	async releaseDecidedMessageReservation(userId: string, todayIsoDate: string): Promise<void> {
		await this.usageRepo.decrement(userId, todayIsoDate);
	}
}
