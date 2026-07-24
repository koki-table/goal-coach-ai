import { SUCCESS_RATE_THRESHOLDS } from "../config/coachConfig";

export type SuccessRateStyle = {
	bgColor: string;
	textColor: string;
	borderColor: string;
	barColor: string;
	label: string;
};

/**
 * successRate（0-100）に応じた色・ラベルを返す
 * 閾値は success>=70, warning>=40, destructive<40 の3段階
 */
export function getSuccessRateStyle(successRate: number): SuccessRateStyle {
	if (successRate >= SUCCESS_RATE_THRESHOLDS.SUCCESS) {
		return {
			bgColor: "bg-success/10",
			textColor: "text-success",
			borderColor: "border-success/30",
			barColor: "bg-success",
			label: "順調",
		};
	}
	if (successRate >= SUCCESS_RATE_THRESHOLDS.WARNING) {
		return {
			bgColor: "bg-warning/10",
			textColor: "text-warning",
			borderColor: "border-warning/30",
			barColor: "bg-warning",
			label: "要注意",
		};
	}
	return {
		bgColor: "bg-destructive/10",
		textColor: "text-destructive",
		borderColor: "border-destructive/30",
		barColor: "bg-destructive",
		label: "危険",
	};
}
