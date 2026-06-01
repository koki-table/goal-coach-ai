"use client";

import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/atom/badge";
import { Button } from "@/components/atom/button";
import {
	Check,
	Trash,
	DotsSixVertical,
	Clock,
	ArrowRight,
	ArrowCounterClockwise,
} from "@phosphor-icons/react";
import type { Todo } from "../types";

type TodoItemProps = {
	todo: Todo;
	isMyTodo: boolean;
	onToggleComplete?: () => void;
	onReset?: () => void;
	onDelete?: () => void;
	onMoveToOther?: () => void;
};

export function TodoItem({
	todo,
	isMyTodo,
	onToggleComplete,
	onReset,
	onDelete,
	onMoveToOther,
}: TodoItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: todo.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

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
			{/* ドラッグハンドル */}
			<button
				type="button"
				className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
				{...attributes}
				{...listeners}
			>
				<DotsSixVertical weight="bold" className="size-5" />
			</button>

			{/* 完了チェックボックス（マイTODOのみ） */}
			{isMyTodo && (
				<button
					type="button"
					onClick={onToggleComplete}
					className={cn(
						"flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
						todo.completed
							? "border-emerald-500 bg-emerald-500 text-white"
							: "border-muted-foreground hover:border-primary",
					)}
				>
					{todo.completed && <Check weight="bold" className="size-3" />}
				</button>
			)}

			{/* タスク内容 */}
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<p
						className={cn(
							"text-sm font-medium",
							todo.completed && "text-muted-foreground line-through",
						)}
					>
						{todo.title}
					</p>
					{/* 完了回数バッジ */}
					{todo.completionCount > 0 && (
						<Badge
							variant="secondary"
							className="shrink-0 px-1.5 py-0 text-xs font-normal"
						>
							{todo.completionCount}回達成
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					{todo.dueDate && (
						<span className="flex items-center gap-1">
							<Clock weight="bold" className="size-3" />
							{todo.dueDate}
						</span>
					)}
					{todo.estimatedMinutes && <span>{todo.estimatedMinutes}分</span>}
				</div>
			</div>

			{/* アクションボタン */}
			<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				{/* リセットボタン（完了済みのマイTODOのみ） */}
				{isMyTodo && todo.completed && onReset && (
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={onReset}
						title="リセット（再度実行可能にする）"
					>
						<ArrowCounterClockwise weight="bold" className="size-3.5" />
					</Button>
				)}
				{/* 移動ボタン */}
				{onMoveToOther && (
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={onMoveToOther}
						title={isMyTodo ? "候補に戻す" : "マイTODOに追加"}
					>
						<ArrowRight
							weight="bold"
							className={cn(
								"size-3.5",
								isMyTodo && "rotate-180",
							)}
						/>
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
