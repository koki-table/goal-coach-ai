"use client";

import { useState } from "react";
import { Button } from "@/components/atom/button";
import { Input } from "@/components/atom/input";
import { Label } from "@/components/atom/label";
import { cn } from "@/lib/utils";
import { Check, X } from "@phosphor-icons/react";
import type { Milestone } from "../types";
import { milestoneLevelLabels } from "../types";
import type { MilestoneLevel } from "../schemas/todoSchema";

type MilestoneFormData = {
	short: { title: string; isCompleted: boolean };
	medium: { title: string; isCompleted: boolean };
	long: { title: string; isCompleted: boolean };
};

type MilestoneFormProps = {
	milestones: Milestone[];
	onSave: (data: MilestoneFormData) => Promise<void>;
	onCancel: () => void;
	className?: string;
};

const defaultFormData: MilestoneFormData = {
	short: { title: "", isCompleted: false },
	medium: { title: "", isCompleted: false },
	long: { title: "", isCompleted: false },
};

export function MilestoneForm({
	milestones,
	onSave,
	onCancel,
	className,
}: MilestoneFormProps) {
	// 既存のマイルストーンからフォームデータを初期化
	const initialData = milestones.reduce<MilestoneFormData>(
		(acc, m) => {
			acc[m.level] = { title: m.title, isCompleted: m.isCompleted };
			return acc;
		},
		{ ...defaultFormData },
	);

	const [formData, setFormData] = useState<MilestoneFormData>(initialData);
	const [isSaving, setIsSaving] = useState(false);

	const handleChange = (
		level: MilestoneLevel,
		field: "title" | "isCompleted",
		value: string | boolean,
	) => {
		setFormData((prev) => ({
			...prev,
			[level]: { ...prev[level], [field]: value },
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.short.title || !formData.medium.title || !formData.long.title) {
			return;
		}
		setIsSaving(true);
		try {
			await onSave(formData);
		} finally {
			setIsSaving(false);
		}
	};

	const levels: MilestoneLevel[] = ["short", "medium", "long"];

	return (
		<form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
			<div className="space-y-3">
				{levels.map((level) => (
					<div key={level} className="space-y-1.5">
						<div className="flex items-center justify-between">
							<Label htmlFor={`milestone-${level}`} className="text-sm">
								{milestoneLevelLabels[level]}
							</Label>
							<button
								type="button"
								onClick={() =>
									handleChange(level, "isCompleted", !formData[level].isCompleted)
								}
								className={cn(
									"flex size-5 items-center justify-center rounded border-2 transition-colors",
									formData[level].isCompleted
										? "border-primary bg-primary text-primary-foreground"
										: "border-muted-foreground/30 hover:border-primary/50",
								)}
							>
								{formData[level].isCompleted && (
									<Check weight="bold" className="size-3" />
								)}
							</button>
						</div>
						<Input
							id={`milestone-${level}`}
							value={formData[level].title}
							onChange={(e) => handleChange(level, "title", e.target.value)}
							placeholder={
								level === "short"
									? "例: 毎日30分の学習習慣化"
									: level === "medium"
										? "例: 模試で目標スコア達成"
										: "例: 本番で最終目標達成"
							}
							className="text-sm"
						/>
					</div>
				))}
			</div>

			<div className="flex justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					<X weight="bold" className="mr-1 size-4" />
					キャンセル
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={
						isSaving ||
						!formData.short.title ||
						!formData.medium.title ||
						!formData.long.title
					}
				>
					<Check weight="bold" className="mr-1 size-4" />
					保存
				</Button>
			</div>
		</form>
	);
}
