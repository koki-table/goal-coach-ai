import { WarningCircle } from "@phosphor-icons/react";

type CoachErrorAlertProps = {
	message: string;
};

export function CoachErrorAlert({ message }: CoachErrorAlertProps) {
	return (
		<div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
			<WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0" />
			<p>{message}</p>
		</div>
	);
}
