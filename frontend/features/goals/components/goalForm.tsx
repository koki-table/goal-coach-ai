"use client";

import { Button } from "@/components/atom/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atom/card";
import { Input } from "@/components/atom/input";
import { Label } from "@/components/atom/label";
import { useState } from "react";
import { GoalCategory, goalInputSchema, goalStatusInputSchema } from "../schemas/goalSchema";
import type { GoalInput, GoalStatusInput } from "../schemas/goalSchema";

// カテゴリの表示名マッピング
const categoryLabels: Record<string, string> = {
	[GoalCategory.STUDY]: "学習",
	[GoalCategory.CAREER]: "キャリア",
	[GoalCategory.HEALTH]: "健康",
	[GoalCategory.SKILL]: "スキル",
	[GoalCategory.FINANCE]: "財務",
	[GoalCategory.OTHER]: "その他",
};

type GoalFormProps = {
	initialData?: Partial<GoalInput>;
	onSubmit: (data: GoalInput) => void;
	onCancel?: () => void;
	isLoading?: boolean;
};

export function GoalForm({ initialData, onSubmit, onCancel, isLoading = false }: GoalFormProps) {
	const [formData, setFormData] = useState<Partial<GoalInput>>({
		title: initialData?.title ?? "",
		description: initialData?.description ?? "",
		deadline: initialData?.deadline ?? "",
		category: initialData?.category ?? GoalCategory.OTHER,
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setErrors({});

		const result = goalInputSchema.safeParse(formData);
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
				<CardTitle>目標を設定する</CardTitle>
				<CardDescription>半年〜1年で達成したい大きな目標を設定しましょう</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="title">
							タイトル <span className="text-destructive">*</span>
						</Label>
						<Input
							id="title"
							placeholder="例: TOEIC 900点を取得する"
							value={formData.title}
							onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
							aria-invalid={!!errors.title}
						/>
						{errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">説明</Label>
						<textarea
							id="description"
							className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							placeholder="目標の詳細や動機を記入してください"
							value={formData.description}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									description: e.target.value,
								}))
							}
						/>
						{errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="deadline">
								期限 <span className="text-destructive">*</span>
							</Label>
							<Input
								id="deadline"
								type="date"
								value={formData.deadline}
								onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
								aria-invalid={!!errors.deadline}
							/>
							{errors.deadline && <p className="text-sm text-destructive">{errors.deadline}</p>}
						</div>

						<div className="space-y-2">
							<Label htmlFor="category">
								カテゴリ <span className="text-destructive">*</span>
							</Label>
							<select
								id="category"
								className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								value={formData.category}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										category: e.target.value as GoalInput["category"],
									}))
								}
							>
								{Object.entries(categoryLabels).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
							{errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-4">
						{onCancel && (
							<Button type="button" variant="outline" onClick={onCancel}>
								キャンセル
							</Button>
						)}
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "保存中..." : "目標を保存"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

// 現状ステータス入力フォーム
type GoalStatusFormProps = {
	initialData?: Partial<GoalStatusInput>;
	onSubmit: (data: GoalStatusInput) => void;
	isLoading?: boolean;
};

export function GoalStatusForm({ initialData, onSubmit, isLoading = false }: GoalStatusFormProps) {
	const [formData, setFormData] = useState<Partial<GoalStatusInput>>({
		progressPercent: initialData?.progressPercent ?? 0,
		memo: initialData?.memo ?? "",
		obstacles: initialData?.obstacles ?? "",
	});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setErrors({});

		const result = goalStatusInputSchema.safeParse(formData);
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
				<CardTitle>現状を更新する</CardTitle>
				<CardDescription>目標に対する現在の立ち位置を入力してください</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="progressPercent">
							進捗率（%） <span className="text-destructive">*</span>
						</Label>
						<div className="flex items-center gap-3">
							<Input
								id="progressPercent"
								type="number"
								min={0}
								max={100}
								className="w-24"
								value={formData.progressPercent}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										progressPercent: Number(e.target.value),
									}))
								}
								aria-invalid={!!errors.progressPercent}
							/>
							<span className="text-muted-foreground">%</span>
						</div>
						{errors.progressPercent && (
							<p className="text-sm text-destructive">{errors.progressPercent}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="memo">メモ</Label>
						<textarea
							id="memo"
							className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							placeholder="現在の状況や気づきなどを記入"
							value={formData.memo}
							onChange={(e) => setFormData((prev) => ({ ...prev, memo: e.target.value }))}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="obstacles">障害事項</Label>
						<textarea
							id="obstacles"
							className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							placeholder="目標達成を妨げている要因"
							value={formData.obstacles}
							onChange={(e) => setFormData((prev) => ({ ...prev, obstacles: e.target.value }))}
						/>
					</div>

					<div className="flex justify-end pt-2">
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "更新中..." : "ステータスを更新"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
