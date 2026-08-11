import type { FaqItem, FeatureItem, HowItWorksStep, TestimonialItem } from "../types";

export const NAV_LINKS = [
	{ label: "機能", href: "#features" },
	{ label: "仕組み", href: "#how-it-works" },
	{ label: "料金", href: "#pricing" },
	{ label: "FAQ", href: "#faq" },
] as const;

export const HERO_HEADLINE = "ペンギンコーチが、あなたの目標達成に伴走する。";
export const HERO_SUBHEADLINE =
	"学ぶ意思はあっても、続ける仕組みがない。ペンタ君が目標をOKRに分解し、毎日のTODOと対話で挫折を防ぎます。";
export const HERO_REASSURANCE = "1日3回まで無料でコーチに相談できます";
export const HERO_SECONDARY_CTA = { label: "使い方を見る", href: "#how-it-works" } as const;

export const FEATURE_ITEMS: FeatureItem[] = [
	{
		icon: "Target",
		title: "OKRで目標を分解",
		description:
			"目標(Objective)とKey Resultsで、ふんわりした目標を測れる形に。60〜70%到達を目指す、あえて高い目標設計。",
	},
	{
		icon: "ChatCircleDots",
		title: "AIコーチと対話",
		description: "ペンタ君との対話で現状・制約・期限を引き出し、Key ResultsとTODOをその場で提案。",
	},
	{
		icon: "CheckSquare",
		title: "日々のTODO管理",
		description: "Key Resultsに紐づくタスクを毎日こなす。朝・昼・夜の3タッチで完了。",
	},
	{
		icon: "ChartLineUp",
		title: "進捗を可視化",
		description: "TODO完了率70%＋Key Results達成率30%の加重平均で進捗率を算出。",
	},
	{
		icon: "Sparkle",
		title: "率直なフィードバック",
		description: "遅れていればペンタ君が計画を組み直す。愛のムチで前に進める。",
	},
	{
		icon: "Clock",
		title: "1日5分で回る",
		description: "朝の確認・隙間時間の完了チェック・夜のレビュー。忙しい人でも継続できる設計。",
	},
];

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
	{
		step: 1,
		title: "目標を決める",
		description: "達成したいことをペンタ君に伝えるだけ。",
	},
	{
		step: 2,
		title: "ペンタ君と対話してKRとTODOに分解",
		description: "対話の中でKey ResultsとTODOが提案され、採用ボタンひとつで計画に反映。",
	},
	{
		step: 3,
		title: "毎日こなして進捗を可視化",
		description: "タスクを消化するたびに進捗率が更新され、遅れがあればペンタ君が気づかせてくれる。",
	},
];

export const HOW_IT_WORKS_HINT = "Key Resultsは60〜70%到達で大成功。100%届く目標は低すぎるペン。";

export const TESTIMONIAL_ITEMS: TestimonialItem[] = [
	{
		quote:
			"資格試験の勉強、独学だと三日で止まっていたのが、ペンタ君に毎日聞かれるようになってから続いています。",
		role: "会社員・簿記2級を目指して勉強中",
	},
	{
		quote:
			"転職活動でやることが多すぎて迷子になっていましたが、OKRに分解してもらって何をすべきかが明確になりました。",
		role: "エンジニア・転職準備中",
	},
	{
		quote:
			"進捗が数字で見えるので、焦る前に軌道修正できるのがいいです。人間のコーチだと続けられなかったので助かっています。",
		role: "マーケター・英語学習継続中",
	},
];

export const FAQ_ITEMS: FaqItem[] = [
	{
		question: "無料でどこまで使えますか？",
		answer: "目標・TODO管理は無制限、ペンタ君との対話は1日3回まで無料でお使いいただけます。",
	},
	{
		question: "クレジットカードは必要ですか？",
		answer: "Freeプランはカード登録不要です。Proへのアップグレード時のみ必要です。",
	},
	{
		question: "OKRって何ですか？",
		answer:
			"Objective（目指す方向性）とKey Results（達成を測る定量指標）で目標を分解する手法です。ペンタ君が対話で一緒に作ります。",
	},
	{
		question: "本当にAIが伴走してくれるんですか？",
		answer:
			"対話でKey ResultsとTODOを提案し、進捗率をもとに率直なフィードバックを返します。今後は停滞時のプッシュ通知も追加予定です。",
	},
];

export const FINAL_CTA_HEADLINE = "「学びが続かない」を、ペンタ君の伴走で終わらせる。";
export const FINAL_CTA_SUBHEADLINE = "今日、目標を1つ伝えるだけで始まります。";

export const FOOTER_LINK_COLUMNS = [
	{
		heading: "プロダクト",
		links: [
			{ label: "機能", href: "#features" },
			{ label: "料金", href: "#pricing" },
			{ label: "FAQ", href: "#faq" },
		],
	},
	{
		heading: "サポート",
		links: [
			{ label: "お問い合わせ", href: "#" },
			{ label: "利用規約(準備中)", href: "#" },
			{ label: "プライバシーポリシー(準備中)", href: "#" },
		],
	},
] as const;
