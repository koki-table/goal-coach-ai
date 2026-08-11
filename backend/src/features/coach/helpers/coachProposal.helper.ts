import type { GoalCategoryType } from "../../../types/api";
import type { CoachProposal, PlanProposal } from "../prompts/coachPrompts";
import type { CoachChatPromptMessage } from "./coachChatPrompt.helper";

// 定量目標値の既定値。LLMがmilestoneTargetValueをnullで返した場合の代替。
// 数値目標が無いKRは 0〜100% スケールで扱う（目標100・単位%）。
const DEFAULT_MILESTONE_TARGET_VALUE = 100;
const DEFAULT_MILESTONE_UNIT = "%";

// coach_messages.proposal に保存する提案ペイロード(レガシー形式)。採用済みかどうかと、採用時に
// 作成したエンティティのidを保持し、二重採用の判定と表示に使う。
// @deprecated 新規に書き込むproposalはProposalEnvelope(version:1)を使う。読み取り時の
// レガシー正規化(parseProposalPayload)のためこの型を残す。
export type PlanProposalPayload = {
	milestone: {
		title: string;
		targetValue: number;
		unit: string;
		adopted: boolean;
		createdMilestoneId?: string;
	} | null;
	todos: { title: string; taskType: "daily" | "once"; adopted: boolean; createdTodoId?: string }[];
};

export type ProposalTodo = {
	title: string;
	taskType: "daily" | "once";
	adopted: boolean;
	createdTodoId?: string;
};

export type ProposalObjective = {
	title: string;
	deadline: string | null;
	category: GoalCategoryType;
} | null;

export type ProposalKeyResult = {
	title: string;
	targetValue: number;
	unit: string;
	adopted: boolean;
	createdMilestoneId?: string;
};

// 日次レビューがAIの推定として提案する、既存KR(milestones行)のcurrentValue更新案。
// 新規KRを作るkeyResultsとは異なり、既存のmilestoneIdを対象にするため作成系のcreatedXxxIdは持たない。
// baselineCurrentValueは提案生成時点のcurrentValueのスナップショット。採用時にDBの最新値と
// 比較し、その間にユーザーが「+更新」で手動変更していないかを検証するための楽観的ロックに使う
// (古いチャットメッセージから提案を採用して、後からの手動更新を上書きしてしまう事故を防ぐ)。
export type ProposalMilestoneUpdate = {
	milestoneId: string;
	milestoneTitle: string;
	baselineCurrentValue: number;
	suggestedCurrentValue: number;
	reason: string;
	adopted: boolean;
	appliedCurrentValue?: number;
};

// coach_messages.proposal の現行フォーマット。KR(Key Results)は既存のmilestonesテーブル/
// MilestoneRepositoryの呼称変更であり、新規DBエンティティではない(採用時にmilestones行を作る)。
export type ProposalEnvelope = {
	version: 1;
	objective: ProposalObjective;
	keyResults: ProposalKeyResult[];
	todos: ProposalTodo[];
	milestoneUpdates: ProposalMilestoneUpdate[];
};

// 保存済みJSON(レガシー{milestone,todos}、または現行{version:1,...})を読み取り時に
// version:1のProposalEnvelopeへ正規化する。SQL migrationは不要(proposalは型なしJSON列のため)。
// DB由来の値なので、null/プリミティブ/欠損フィールドでも例外を投げず安全側に倒す。
export function parseProposalPayload(raw: string): ProposalEnvelope {
	const parsed: unknown = JSON.parse(raw);
	// nullやプリミティブ("in"演算子がTypeErrorになる)を弾き、空エンベロープにフォールバック
	if (typeof parsed !== "object" || parsed === null) {
		return { version: 1, objective: null, keyResults: [], todos: [], milestoneUpdates: [] };
	}

	if ("version" in parsed && (parsed as ProposalEnvelope).version === 1) {
		const envelope = parsed as ProposalEnvelope;
		return {
			version: 1,
			objective: envelope.objective ?? null,
			keyResults: envelope.keyResults ?? [],
			todos: envelope.todos ?? [],
			// milestoneUpdatesは日次レビュー機能追加前に保存された既存行に存在しないため、
			// 欠損時は空配列にフォールバックする(後方互換)
			milestoneUpdates: envelope.milestoneUpdates ?? [],
		};
	}

	const legacy = parsed as PlanProposalPayload;
	return {
		version: 1,
		objective: null,
		keyResults: legacy.milestone ? [{ ...legacy.milestone }] : [],
		todos: legacy.todos ?? [],
		milestoneUpdates: [],
	};
}

// メッセージ履歴をプロンプト用の形式に変換する。assistantメッセージのproposalは
// AIが既提案・採用済み項目を認識し重複提案を避けられるよう、採用状態を明示した形で渡す。
// レガシー{milestone,todos}形式も保存されているためparseProposalPayloadで正規化してから読む。
export function toPromptMessage(message: {
	role: string;
	content: string;
	proposal: string | null;
}): CoachChatPromptMessage {
	const role = message.role === "user" ? "user" : "assistant";
	if (!message.proposal) {
		return { role, content: message.content };
	}

	const envelope = parseProposalPayload(message.proposal);
	// objective自体は採用状態を持たず、採用はkeyResults全体をatomicにadopted=trueへ
	// 更新する形で表現される(adoptObjective参照)。そこから導出する
	const objectiveAdopted =
		envelope.keyResults.length > 0 && envelope.keyResults.every((kr) => kr.adopted);
	return {
		role,
		content: message.content,
		proposal: {
			objective: envelope.objective
				? { title: envelope.objective.title, adopted: objectiveAdopted }
				: null,
			keyResults: envelope.keyResults.map((kr) => ({ title: kr.title, adopted: kr.adopted })),
			todos: envelope.todos.map((t) => ({ title: t.title, adopted: t.adopted })),
			milestoneUpdates: envelope.milestoneUpdates.map((u) => ({
				title: u.milestoneTitle,
				adopted: u.adopted,
			})),
		},
	};
}

// プロンプトの指示だけに頼らず、既存マイルストーンと完全一致するタイトルが返ってきた場合は
// サーバー側で確実に除外する(会話履歴のウィンドウ外でも重複作成を防ぐ安全策)。
// @deprecated 新規コードはtoProposalEnvelopeを使う。
export function toProposalPayload(
	planProposal: PlanProposal,
	existingMilestoneTitles: string[],
): PlanProposalPayload {
	const isDuplicateMilestone =
		planProposal.milestoneTitle !== null &&
		existingMilestoneTitles.some((title) => title.trim() === planProposal.milestoneTitle?.trim());

	return {
		milestone:
			planProposal.milestoneTitle && !isDuplicateMilestone
				? {
						title: planProposal.milestoneTitle,
						targetValue: planProposal.milestoneTargetValue ?? DEFAULT_MILESTONE_TARGET_VALUE,
						unit: planProposal.milestoneUnit ?? DEFAULT_MILESTONE_UNIT,
						adopted: false,
					}
				: null,
		todos: planProposal.todos.map((t) => ({
			title: t.title,
			taskType: t.taskType,
			adopted: false,
		})),
	};
}

// LLM出力(CoachProposal)をDB保存用のProposalEnvelopeへ変換する。
// - Objective確定済み("decided")スレッドではobjectiveを常にnullへ強制する(LLMが誤って
//   返してもサーバー側で除去する)
// - 既存KRタイトルと完全一致するKRは重複作成を防ぐため除外する(会話履歴のウィンドウ外でも安全)
export function toProposalEnvelope(
	proposal: CoachProposal,
	options: { objectiveStatus: "decided" | "undecided"; existingKeyResultTitles: string[] },
): ProposalEnvelope {
	const keyResults = proposal.keyResults
		.filter(
			(kr) => !options.existingKeyResultTitles.some((title) => title.trim() === kr.title.trim()),
		)
		.map((kr) => ({
			title: kr.title,
			targetValue: kr.targetValue ?? DEFAULT_MILESTONE_TARGET_VALUE,
			unit: kr.unit ?? DEFAULT_MILESTONE_UNIT,
			adopted: false,
		}));

	return {
		version: 1,
		objective: options.objectiveStatus === "undecided" ? proposal.objective : null,
		keyResults,
		todos: proposal.todos.map((t) => ({
			title: t.title,
			taskType: t.taskType,
			adopted: false,
		})),
		// 通常チャットの提案はKR新規作成/TODO提案のみを扱い、既存KRの数値更新は
		// 日次レビュー専用のtoDailyReviewProposalEnvelopeが担う
		milestoneUpdates: [],
	};
}

export type DailyReviewMilestoneCandidate = {
	id: string;
	title: string;
	startValue: number;
	currentValue: number;
	targetValue: number;
	isCompleted: boolean;
};

export type DailyReviewResult = {
	reply: string;
	milestoneUpdates: { milestoneId: string; suggestedCurrentValue: number; reason: string }[];
	todos: { title: string; taskType: "daily" | "once" }[];
};

// 日次レビューのLLM出力をProposalEnvelopeへ変換する。プロンプトの指示だけに頼らず、
// サーバー側で安全網を敷く: (1)実在しないmilestoneIdは除外、(2)既に完了済みのKRは
// 提案対象から除外(ユーザーの目に見える形で完了済みの値を後退させない)、
// (3)suggestedCurrentValueは[startValue, targetValue]にクランプする。
export function toDailyReviewProposalEnvelope(
	result: DailyReviewResult,
	milestones: DailyReviewMilestoneCandidate[],
): ProposalEnvelope {
	const milestoneById = new Map(milestones.map((m) => [m.id, m]));

	const milestoneUpdates = result.milestoneUpdates.flatMap((update) => {
		const milestone = milestoneById.get(update.milestoneId);
		if (!milestone || milestone.isCompleted) return [];

		const clamped = Math.min(
			Math.max(update.suggestedCurrentValue, milestone.startValue),
			milestone.targetValue,
		);

		return [
			{
				milestoneId: milestone.id,
				milestoneTitle: milestone.title,
				baselineCurrentValue: milestone.currentValue,
				suggestedCurrentValue: clamped,
				reason: update.reason,
				adopted: false,
			},
		];
	});

	return {
		version: 1,
		objective: null,
		keyResults: [],
		todos: result.todos.map((t) => ({ title: t.title, taskType: t.taskType, adopted: false })),
		milestoneUpdates,
	};
}
