"use client";

import { Button } from "@/components/atom/button";
import { Input } from "@/components/atom/input";
import { Label } from "@/components/atom/label";
import { Select } from "@/components/atom/select";
import { Textarea } from "@/components/atom/textarea";
import { useEffect, useState } from "react";
import type { TodoInput, TodoUpdateInput } from "../schemas/todoSchema";
import type { Milestone, Todo, TodoPriority } from "../types";

type TodoEditFormEditProps = {
	mode: "edit";
	todo: Todo | null;
	goalId?: never;
	milestones: Milestone[];
	isOpen: boolean;
	onClose: () => void;
	onSave: (todoId: string, input: TodoUpdateInput) => void;
	onCreate?: never;
};

type TodoEditFormCreateProps = {
	mode: "create";
	todo?: never;
	goalId: string;
	milestones: Milestone[];
	isOpen: boolean;
	onClose: () => void;
	onSave?: never;
	onCreate: (goalId: string, input: TodoInput) => void;
};

export type TodoEditFormProps = TodoEditFormEditProps | TodoEditFormCreateProps;

export function TodoEditForm(props: TodoEditFormProps) {
	const { mode, milestones, isOpen, onClose } = props;

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<TodoPriority | "">("");
	const [dueDate, setDueDate] = useState("");
	const [estimatedMinutes, setEstimatedMinutes] = useState("");
	const [milestoneId, setMilestoneId] = useState("");

	const resetForm = () => {
		setTitle("");
		setDescription("");
		setPriority("");
		setDueDate("");
		setEstimatedMinutes("");
		setMilestoneId("");
	};

	// Sheet/Modalは@base-ui/react/dialogのcontrolled propで開かれるため、
	// プログラム的なopen時はonOpenChangeが発火しない。
	// フォーム初期化はopen状態と対象todoに応じてuseEffectで宣言的に行う。
	// biome-ignore lint/correctness/useExhaustiveDependencies: todoはidが変わった時のみ再初期化する
	useEffect(() => {
		if (!isOpen) return;
		if (mode === "edit" && props.todo) {
			setTitle(props.todo.title);
			setDescription(props.todo.description ?? "");
			setPriority(props.todo.priority ?? "");
			setDueDate(props.todo.dueDate ?? "");
			setEstimatedMinutes(props.todo.estimatedMinutes ? String(props.todo.estimatedMinutes) : "");
			setMilestoneId(props.todo.milestoneId ?? "");
		} else if (mode === "create") {
			resetForm();
		}
	}, [isOpen, mode, props.todo?.id]);

	const handleSave = () => {
		if (mode === "edit") {
			const todo = props.todo;
			if (!todo) return;

			const input: TodoUpdateInput = {};

			if (title !== todo.title) {
				input.title = title;
			}
			if (description !== (todo.description ?? "")) {
				input.description = description || null;
			}
			// priorityはDB上必須（デフォルト"medium"）のためnullは送らない
			if (priority && priority !== (todo.priority ?? "")) {
				input.priority = priority;
			}
			if (dueDate !== (todo.dueDate ?? "")) {
				input.dueDate = dueDate || null;
			}
			const mins = estimatedMinutes ? Number(estimatedMinutes) : null;
			if (mins !== (todo.estimatedMinutes ?? null)) {
				input.estimatedMinutes = mins;
			}
			if (milestoneId !== (todo.milestoneId ?? "")) {
				input.milestoneId = milestoneId || null;
			}

			// 変更がある場合のみ保存
			if (Object.keys(input).length > 0) {
				props.onSave(todo.id, input);
			}
		} else {
			const input: TodoInput = {
				title: title.trim(),
				...(description && { description }),
				...(priority && { priority }),
				...(dueDate && { dueDate }),
				...(estimatedMinutes && { estimatedMinutes: Number(estimatedMinutes) }),
				...(milestoneId && { milestoneId }),
			};
			props.onCreate(props.goalId, input);
		}
		onClose();
	};

	const submitLabel = mode === "create" ? "作成" : "保存";

	return (
		<>
			<div className="space-y-4 px-4">
				{/* タイトル */}
				<div className="space-y-1.5">
					<Label htmlFor="todo-title">タイトル</Label>
					<Input
						id="todo-title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="タスク名"
					/>
				</div>

				{/* 説明文 */}
				<div className="space-y-1.5">
					<Label htmlFor="todo-description">説明</Label>
					<Textarea
						id="todo-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="タスクの説明..."
						rows={3}
					/>
				</div>

				{/* 優先度 */}
				<div className="space-y-1.5">
					<Label htmlFor="todo-priority">優先度</Label>
					<Select
						id="todo-priority"
						value={priority}
						onChange={(e) => setPriority(e.target.value as TodoPriority | "")}
					>
						<option value="">未設定</option>
						<option value="high">高</option>
						<option value="medium">中</option>
						<option value="low">低</option>
					</Select>
				</div>

				{/* 期日 */}
				<div className="space-y-1.5">
					<Label htmlFor="todo-due-date">期日</Label>
					<Input
						id="todo-due-date"
						type="date"
						value={dueDate}
						onChange={(e) => setDueDate(e.target.value)}
					/>
				</div>

				{/* 見積もり時間 */}
				<div className="space-y-1.5">
					<Label htmlFor="todo-estimated-minutes">見積もり時間（分）</Label>
					<Input
						id="todo-estimated-minutes"
						type="number"
						min={1}
						max={480}
						value={estimatedMinutes}
						onChange={(e) => setEstimatedMinutes(e.target.value)}
						placeholder="例: 30"
					/>
				</div>

				{/* マイルストーン */}
				<div className="space-y-1.5">
					<Label htmlFor="todo-milestone">マイルストーン</Label>
					<Select
						id="todo-milestone"
						value={milestoneId}
						onChange={(e) => setMilestoneId(e.target.value)}
					>
						<option value="">なし</option>
						{milestones.map((m) => (
							<option key={m.id} value={m.id}>
								{m.title}
							</option>
						))}
					</Select>
				</div>
			</div>

			<div className="mt-auto flex flex-col gap-2 p-4">
				<Button variant="outline" onClick={onClose}>
					キャンセル
				</Button>
				<Button onClick={handleSave} disabled={!title.trim()}>
					{submitLabel}
				</Button>
			</div>
		</>
	);
}
