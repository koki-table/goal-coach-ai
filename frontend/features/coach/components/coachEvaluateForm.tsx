"use client";

import { Button } from "@/components/atom/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atom/card";
import { Label } from "@/components/atom/label";
import { Progress, ProgressLabel, ProgressValue } from "@/components/atom/progress";
import { useState } from "react";
import { z } from "zod";

const coachEvaluateFormSchema = z.object({
	memo: z.string().max(1000, "メモは1000文字以内で入力してください").optional(),
	obstacles: z.string().max(500, "障害事項は500文字以内で入力してください").optional(),
});

export type CoachEvaluateFormValues = {
	memo?: string;
	obstacles?: string;
};

type CoachEvaluateFormProps = {
	autoProgressPercent: number;
	onSubmit: (data: CoachEvaluateFormValues) => void;
	isLoading?: boolean;
	disabled?: boolean;
};

export function CoachEvaluateForm({
	autoProgressPercent,
	onSubmit,
	isLoading = false,
	disabled = false,
}: CoachEvaluateFormProps) {
	const [formData, setFormData] = useState<CoachEvaluateFormValues>({
		memo: "",
		obstacles: "",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setErrors({});

		const result = coachEvaluateFormSchema.safeParse(formData);
		if (!result.success) {
			const newErrors: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const path = issue.path[0] as string;
				newErrors[path] = issue.message;
			}
			setErrors(newErrors);
			return;
		}

		onSubmit(result.data);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>現状を評価してもらう</CardTitle>
				<CardDescription>
					進捗はTODO・マイルストーンの完了状況から自動で算出されます
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Progress value={autoProgressPercent}>
							<ProgressLabel>自動算出した現在の進捗</ProgressLabel>
							<ProgressValue />
						</Progress>
					</div>

					<div className="space-y-2">
						<Label htmlFor="memo">メモ</Label>
						<textarea
							id="memo"
							className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							placeholder="現在の状況や気づきなどを記入"
							value={formData.memo}
							onChange={(e) => setFormData((prev) => ({ ...prev, memo: e.target.value }))}
							disabled={disabled}
						/>
						{errors.memo && <p className="text-sm text-destructive">{errors.memo}</p>}
					</div>

					<div className="space-y-2">
						<Label htmlFor="obstacles">障害事項</Label>
						<textarea
							id="obstacles"
							className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							placeholder="目標達成を妨げている要因"
							value={formData.obstacles}
							onChange={(e) => setFormData((prev) => ({ ...prev, obstacles: e.target.value }))}
							disabled={disabled}
						/>
						{errors.obstacles && <p className="text-sm text-destructive">{errors.obstacles}</p>}
					</div>

					<div className="flex justify-end pt-2">
						<Button type="submit" disabled={isLoading || disabled}>
							{isLoading ? "評価中..." : "AIコーチに評価してもらう"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
