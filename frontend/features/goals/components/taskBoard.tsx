"use client";

import { useState } from "react";
import {
	DndContext,
	DragOverlay,
	closestCorners,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import { Button } from "@/components/atom/button";
import { Input } from "@/components/atom/input";
import { Badge } from "@/components/atom/badge";
import { cn } from "@/lib/utils";
import {
	Robot,
	ListChecks,
	Check,
	Trash,
	Plus,
	DotsSixVertical,
	ArrowRight,
	Clock,
} from "@phosphor-icons/react";
import type { Task, TaskBoard } from "../types";
import type { TaskInput } from "../schemas/goalSchema";

// ドラッグ可能なタスクアイテム
type SortableTaskItemProps = {
	task: Task;
	onToggleComplete?: () => void;
	onDelete?: () => void;
	onMoveToOther?: () => void;
	isMyTodo: boolean;
};

function SortableTaskItem({
	task,
	onToggleComplete,
	onDelete,
	onMoveToOther,
	isMyTodo,
}: SortableTaskItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id });

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
				task.completed && "bg-muted/50",
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
						task.completed
							? "border-success bg-success text-success-foreground"
							: "border-muted-foreground hover:border-primary",
					)}
				>
					{task.completed && <Check weight="bold" className="size-3" />}
				</button>
			)}

			{/* タスク内容 */}
			<div className="min-w-0 flex-1">
				<p
					className={cn(
						"text-sm font-medium",
						task.completed && "text-muted-foreground line-through",
					)}
				>
					{task.title}
				</p>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					{task.dueDate && (
						<span className="flex items-center gap-1">
							<Clock weight="bold" className="size-3" />
							{task.dueDate}
						</span>
					)}
					{task.estimatedMinutes && (
						<span>{task.estimatedMinutes}分</span>
					)}
				</div>
			</div>

			{/* アクションボタン */}
			<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				{onMoveToOther && (
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={onMoveToOther}
						title={isMyTodo ? "候補に戻す" : "マイTODOに追加"}
					>
						<ArrowRight
							weight="bold"
							className={cn("size-3.5", !isMyTodo && "rotate-0", isMyTodo && "rotate-180")}
						/>
					</Button>
				)}
				{onDelete && (
					<Button variant="ghost" size="icon-xs" onClick={onDelete}>
						<Trash weight="bold" className="size-3.5 text-destructive" />
					</Button>
				)}
			</div>
		</div>
	);
}

// ドラッグ中のオーバーレイ表示
function TaskOverlay({ task }: { task: Task }) {
	return (
		<div className="flex items-center gap-2 rounded-lg border-2 border-primary bg-card p-3 shadow-lg">
			<DotsSixVertical weight="bold" className="size-5 text-muted-foreground" />
			<p className="text-sm font-medium">{task.title}</p>
		</div>
	);
}

// 新規タスク追加フォーム
type AddTaskFormProps = {
	onAdd: (input: TaskInput) => void;
	placeholder?: string;
};

function AddTaskForm({ onAdd, placeholder = "新しいタスクを追加..." }: AddTaskFormProps) {
	const [title, setTitle] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;
		onAdd({ title: title.trim() });
		setTitle("");
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Input
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder={placeholder}
				className="flex-1"
			/>
			<Button type="submit" size="sm" disabled={!title.trim()}>
				<Plus weight="bold" className="mr-1" />
				追加
			</Button>
		</form>
	);
}

// メインのTaskBoardコンポーネント
type TaskBoardProps = {
	taskBoard: TaskBoard;
	onMoveToMyTodos: (taskId: string) => void;
	onMoveToAiGenerated: (taskId: string) => void;
	onToggleComplete: (taskId: string) => void;
	onAddTask: (input: TaskInput, isMyTodo: boolean) => void;
	onDeleteTask: (taskId: string) => void;
	onReorder: (
		sourceList: "aiGeneratedTasks" | "myTodos",
		sourceIndex: number,
		destinationList: "aiGeneratedTasks" | "myTodos",
		destinationIndex: number,
	) => void;
};

export function TaskBoard({
	taskBoard,
	onMoveToMyTodos,
	onMoveToAiGenerated,
	onToggleComplete,
	onAddTask,
	onDeleteTask,
	onReorder,
}: TaskBoardProps) {
	const [activeTask, setActiveTask] = useState<Task | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event;
		const task =
			taskBoard.aiGeneratedTasks.find((t) => t.id === active.id) ||
			taskBoard.myTodos.find((t) => t.id === active.id);
		if (task) {
			setActiveTask(task);
		}
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveTask(null);

		if (!over) return;

		const activeId = active.id as string;
		const overId = over.id as string;

		// ソースリストとインデックスを特定
		const isActiveInAi = taskBoard.aiGeneratedTasks.some((t) => t.id === activeId);
		const sourceList = isActiveInAi ? "aiGeneratedTasks" : "myTodos";
		const sourceIndex = taskBoard[sourceList].findIndex((t) => t.id === activeId);

		// ドロップ先を特定
		let destinationList: "aiGeneratedTasks" | "myTodos";
		let destinationIndex: number;

		if (overId === "ai-droppable" || overId === "my-droppable") {
			// エリア自体にドロップされた場合
			destinationList = overId === "ai-droppable" ? "aiGeneratedTasks" : "myTodos";
			destinationIndex = taskBoard[destinationList].length;
		} else {
			// 別のタスクの上にドロップされた場合
			const isOverInAi = taskBoard.aiGeneratedTasks.some((t) => t.id === overId);
			destinationList = isOverInAi ? "aiGeneratedTasks" : "myTodos";
			destinationIndex = taskBoard[destinationList].findIndex((t) => t.id === overId);
		}

		if (sourceIndex === -1) return;

		onReorder(sourceList, sourceIndex, destinationList, destinationIndex);
	};

	const completedCount = taskBoard.myTodos.filter((t) => t.completed).length;
	const totalMyTodos = taskBoard.myTodos.length;

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="grid gap-4 lg:grid-cols-2">
				{/* AI生成タスクエリア */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2 text-base">
								<Robot weight="fill" className="size-5 text-primary" />
								AI候補タスク
							</CardTitle>
							<Badge variant="secondary">
								{taskBoard.aiGeneratedTasks.length}件
							</Badge>
						</div>
						<p className="text-xs text-muted-foreground">
							AIが提案したタスク。右にドラッグしてマイTODOに追加
						</p>
					</CardHeader>
					<CardContent>
						<SortableContext
							id="ai-droppable"
							items={taskBoard.aiGeneratedTasks.map((t) => t.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="min-h-40 space-y-2">
								{taskBoard.aiGeneratedTasks.length === 0 ? (
									<div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
										AI候補タスクはありません
									</div>
								) : (
									taskBoard.aiGeneratedTasks.map((task) => (
										<SortableTaskItem
											key={task.id}
											task={task}
											isMyTodo={false}
											onMoveToOther={() => onMoveToMyTodos(task.id)}
											onDelete={() => onDeleteTask(task.id)}
										/>
									))
								)}
							</div>
						</SortableContext>
					</CardContent>
				</Card>

				{/* マイTODOエリア */}
				<Card className="border-primary/30">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2 text-base">
								<ListChecks weight="fill" className="size-5 text-primary" />
								マイTODO
							</CardTitle>
							<Badge>
								{completedCount}/{totalMyTodos}完了
							</Badge>
						</div>
						<p className="text-xs text-muted-foreground">
							実行するタスク。チェックで完了、自由に編集可能
						</p>
					</CardHeader>
					<CardContent className="space-y-3">
						<AddTaskForm
							onAdd={(input) => onAddTask(input, true)}
							placeholder="今日やるタスクを追加..."
						/>
						<SortableContext
							id="my-droppable"
							items={taskBoard.myTodos.map((t) => t.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="min-h-40 space-y-2">
								{taskBoard.myTodos.length === 0 ? (
									<div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
										AI候補からタスクをドラッグ、または上から追加
									</div>
								) : (
									taskBoard.myTodos.map((task) => (
										<SortableTaskItem
											key={task.id}
											task={task}
											isMyTodo={true}
											onToggleComplete={() => onToggleComplete(task.id)}
											onMoveToOther={() => onMoveToAiGenerated(task.id)}
											onDelete={() => onDeleteTask(task.id)}
										/>
									))
								)}
							</div>
						</SortableContext>
					</CardContent>
				</Card>
			</div>

			<DragOverlay>
				{activeTask ? <TaskOverlay task={activeTask} /> : null}
			</DragOverlay>
		</DndContext>
	);
}
