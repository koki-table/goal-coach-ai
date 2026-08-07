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

// coach_messages.proposal の現行フォーマット。KR(Key Results)は既存のmilestonesテーブル/
// MilestoneRepositoryの呼称変更であり、新規DBエンティティではない(採用時にmilestones行を作る)。
export type ProposalEnvelope = {
	version: 1;
	objective: ProposalObjective;
	keyResults: ProposalKeyResult[];
	todos: ProposalTodo[];
};

// 保存済みJSON(レガシー{milestone,todos}、または現行{version:1,...})を読み取り時に
// version:1のProposalEnvelopeへ正規化する。SQL migrationは不要(proposalは型なしJSON列のため)。
// DB由来の値なので、null/プリミティブ/欠損フィールドでも例外を投げず安全側に倒す。
export function parseProposalPayload(raw: string): ProposalEnvelope {
	const parsed: unknown = JSON.parse(raw);
	// nullやプリミティブ("in"演算子がTypeErrorになる)を弾き、空エンベロープにフォールバック
	if (typeof parsed !== "object" || parsed === null) {
		return { version: 1, objective: null, keyResults: [], todos: [] };
	}

	if ("version" in parsed && (parsed as ProposalEnvelope).version === 1) {
		const envelope = parsed as ProposalEnvelope;
		return {
			version: 1,
			objective: envelope.objective ?? null,
			keyResults: envelope.keyResults ?? [],
			todos: envelope.todos ?? [],
		};
	}

	const legacy = parsed as PlanProposalPayload;
	return {
		version: 1,
		objective: null,
		keyResults: legacy.milestone ? [{ ...legacy.milestone }] : [],
		todos: legacy.todos ?? [],
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
// - goalスレッドではobjectiveを常にnullへ強制する(LLMが誤って返してもサーバー側で除去する)
// - 既存KRタイトルと完全一致するKRは重複作成を防ぐため除外する(会話履歴のウィンドウ外でも安全)
export function toProposalEnvelope(
	proposal: CoachProposal,
	options: { threadKind: "goal" | "exploration"; existingKeyResultTitles: string[] },
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
		objective: options.threadKind === "exploration" ? proposal.objective : null,
		keyResults,
		todos: proposal.todos.map((t) => ({
			title: t.title,
			taskType: t.taskType,
			adopted: false,
		})),
	};
}
