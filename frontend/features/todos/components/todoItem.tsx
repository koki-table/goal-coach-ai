"use client";

import { Badge } from "@/components/atom/badge";
import { Button } from "@/components/atom/button";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Clock, DotsSixVertical, PencilSimple, Trash } from "@phosphor-icons/react";
import type { Milestone, Todo } from "../types";
import { TodoAiGeneratedBadge } from "./todoAiGeneratedBadge";
import { TodoPriorityBadge } from "./todoPriorityBadge";
import { TodoTaskTypeBadge } from "./todoTaskTypeBadge";

type TodoItemProps = {
	todo: Todo;
	isMyTodo: boolean;
	milestones?: Milestone[];
	dragDisabled?: boolean;
	onToggleComplete?: () => void;
	onDelete?: () => void;
	onEdit?: () => void;
};

export function TodoItem({
	todo,
	isMyTodo,
	milestones = [],
	dragDisabled = false,
	onToggleComplete,
	onDelete,
	onEdit,
}: TodoItemProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: todo.id,
		disabled: dragDisabled,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const linkedMilestone = todo.milestoneId
		? milestones.find((m) => m.id === todo.milestoneId)
		: undefined;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"group flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors",
				isDragging && "opacity-50",
				todo.completed && "bg-muted/50",
			)}
		>
			{/* ドラッグハンドル（ドラッグ不可の時は非表示） */}
			{!dragDisabled && (
				<button
					type="button"
					className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
					{...attributes}
					{...listeners}
				>
					<DotsSixVertical weight="bold" className="size-5" />
				</button>
			)}

			{/* 完了チェックボックス（マイTODOのみ） */}
			{isMyTodo && (
				<button
					type="button"
					onClick={onToggleComplete}
					className={cn(
						"flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
						todo.completed
							? "border-success bg-success text-success-foreground"
							: "border-muted-foreground hover:border-primary",
					)}
				>
					{todo.completed && <Check weight="bold" className="size-3" />}
				</button>
			)}

			{/* タスク内容（クリックで編集Sheet） */}
			<div
				className="min-w-0 flex-1 cursor-pointer"
				onClick={onEdit}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						onEdit?.();
					}
				}}
				role="button"
				tabIndex={0}
			>
				<div className="flex items-center gap-2">
					<p
						className={cn(
							"text-sm font-medium",
							todo.completed && "text-muted-foreground line-through",
						)}
					>
						{todo.title}
					</p>
					{/* タスク種別バッジ（dailyのみ表示） */}
					<TodoTaskTypeBadge taskType={todo.taskType} />
					{/* AI提案バッジ（isAiGeneratedのみ表示） */}
					<TodoAiGeneratedBadge isAiGenerated={todo.isAiGenerated} />
					{/* 優先度バッジ */}
					{todo.priority && <TodoPriorityBadge priority={todo.priority} />}
					{/* 完了回数バッジ */}
					{todo.completionCount > 0 && (
						<Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-xs font-normal">
							{todo.completionCount}回達成
						</Badge>
					)}
				</div>
				{/* 説明文（truncate） */}
				{todo.description && (
					<p className="truncate text-xs text-muted-foreground">{todo.description}</p>
				)}
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					{todo.dueDate && (
						<span className="flex items-center gap-1">
							<Clock weight="bold" className="size-3" />
							{todo.dueDate}
						</span>
					)}
					{todo.estimatedMinutes && <span>{todo.estimatedMinutes}分</span>}
					{/* マイルストーンラベル */}
					{linkedMilestone && (
						<span className="rounded bg-muted px-1.5 py-0.5">{linkedMilestone.title}</span>
					)}
				</div>
			</div>

			{/* アクションボタン */}
			<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				{/* 編集ボタン */}
				{onEdit && (
					<Button variant="ghost" size="icon-xs" onClick={onEdit}>
						<PencilSimple weight="bold" className="size-3.5 text-muted-foreground" />
					</Button>
				)}
				{/* 削除ボタン */}
				{onDelete && (
					<Button variant="ghost" size="icon-xs" onClick={onDelete}>
						<Trash weight="bold" className="size-3.5 text-destructive" />
					</Button>
				)}
			</div>
		</div>
	);
}

// ドラッグ中のオーバーレイ表示用
export function TodoItemOverlay({ todo }: { todo: Todo }) {
	return (
		<div className="flex items-center gap-2 rounded-lg border-2 border-primary bg-card p-3 shadow-lg">
			<DotsSixVertical weight="bold" className="size-5 text-muted-foreground" />
			<p className="text-sm font-medium">{todo.title}</p>
			{todo.completionCount > 0 && (
				<Badge variant="secondary" className="px-1.5 py-0 text-xs">
					{todo.completionCount}回
				</Badge>
			)}
		</div>
	);
}
