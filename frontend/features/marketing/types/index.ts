export type FeatureItem = {
	icon: "Target" | "ChatCircleDots" | "CheckSquare" | "ChartLineUp" | "Sparkle" | "Clock";
	title: string;
	description: string;
};

export type HowItWorksStep = {
	step: number;
	title: string;
	description: string;
};

export type TestimonialItem = {
	quote: string;
	role: string;
};

export type FaqItem = {
	question: string;
	answer: string;
};

export type CtaTarget = {
	label: string;
	href: string;
};
