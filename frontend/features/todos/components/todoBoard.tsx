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
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import { Button } from "@/components/atom/button";
import { Input } from "@/components/atom/input";
import { Badge } from "@/components/atom/badge";
import { Robot, ListChecks, Plus } from "@phosphor-icons/react";
import type { Todo } from "../types";
import type { TodoInput } from "../schemas/todoSchema";
import { TodoItem, TodoItemOverlay } from "./todoItem";

type TodoBoardProps = {
	aiTodos: Todo[];
	myTodos: Todo[];
	goalId: string;
	onToggleComplete: (todoId: string) => void;
	onResetTodo: (todoId: string) => void;
	onDeleteTodo: (todoId: string) => void;
	onMoveTodoToMyTodos: (todoId: string) => void;
	onMoveTodoToAiGenerated: (todoId: string) => void;
	onAddTodo: (goalId: string, input: TodoInput) => void;
	onReorder: (
		sourceList: "aiTodos" | "myTodos",
		sourceIndex: number,
		destinationList: "aiTodos" | "myTodos",
		destinationIndex: number,
		goalId: string,
	) => void;
};

// 新規タスク追加フォーム
function AddTodoForm({
	onAdd,
	placeholder = "新しいTODOを追加...",
}: {
	onAdd: (input: TodoInput) => void;
	placeholder?: string;
}) {
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

export function TodoBoard({
	aiTodos,
	myTodos,
	goalId,
	onToggleComplete,
	onResetTodo,
	onDeleteTodo,
	onMoveTodoToMyTodos,
	onMoveTodoToAiGenerated,
	onAddTodo,
	onReorder,
}: TodoBoardProps) {
	const [activeTodo, setActiveTodo] = useState<Todo | null>(null);

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
		const todo =
			aiTodos.find((t) => t.id === active.id) ||
			myTodos.find((t) => t.id === active.id);
		if (todo) {
			setActiveTodo(todo);
		}
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveTodo(null);

		if (!over) return;

		const activeId = active.id as string;
		const overId = over.id as string;

		const isActiveInAi = aiTodos.some((t) => t.id === activeId);
		const sourceList = isActiveInAi ? "aiTodos" : "myTodos";
		const sourceArray = isActiveInAi ? aiTodos : myTodos;
		const sourceIndex = sourceArray.findIndex((t) => t.id === activeId);

		let destinationList: "aiTodos" | "myTodos";
		let destinationIndex: number;

		if (overId === `ai-droppable-${goalId}` || overId === `my-droppable-${goalId}`) {
			destinationList = overId === `ai-droppable-${goalId}` ? "aiTodos" : "myTodos";
			const destArray = destinationList === "aiTodos" ? aiTodos : myTodos;
			destinationIndex = destArray.length;
		} else {
			const isOverInAi = aiTodos.some((t) => t.id === overId);
			destinationList = isOverInAi ? "aiTodos" : "myTodos";
			const destArray = destinationList === "aiTodos" ? aiTodos : myTodos;
			destinationIndex = destArray.findIndex((t) => t.id === overId);
		}

		if (sourceIndex === -1) return;

		onReorder(sourceList, sourceIndex, destinationList, destinationIndex, goalId);
	};

	const completedCount = myTodos.filter((t) => t.completed).length;
	const totalMyTodos = myTodos.length;

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="grid gap-4 lg:grid-cols-2">
				{/* AI生成TODOエリア */}
				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2 text-base">
								<Robot weight="fill" className="size-5 text-primary" />
								AI候補
							</CardTitle>
							<Badge variant="secondary">{aiTodos.length}件</Badge>
						</div>
						<p className="text-xs text-muted-foreground">
							AIが提案したタスク
						</p>
					</CardHeader>
					<CardContent>
						<SortableContext
							id={`ai-droppable-${goalId}`}
							items={aiTodos.map((t) => t.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="min-h-24 space-y-2">
								{aiTodos.length === 0 ? (
									<div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
										AI候補はありません
									</div>
								) : (
									aiTodos.map((todo) => (
										<TodoItem
											key={todo.id}
											todo={todo}
											isMyTodo={false}
											onMoveToOther={() => onMoveTodoToMyTodos(todo.id)}
											onDelete={() => onDeleteTodo(todo.id)}
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
							実行するタスク
						</p>
					</CardHeader>
					<CardContent className="space-y-3">
						<AddTodoForm
							onAdd={(input) => onAddTodo(goalId, input)}
							placeholder="今日やるタスクを追加..."
						/>
						<SortableContext
							id={`my-droppable-${goalId}`}
							items={myTodos.map((t) => t.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="min-h-24 space-y-2">
								{myTodos.length === 0 ? (
									<div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
										AI候補から追加、または上から入力
									</div>
								) : (
									myTodos.map((todo) => (
										<TodoItem
											key={todo.id}
											todo={todo}
											isMyTodo={true}
											onToggleComplete={() => onToggleComplete(todo.id)}
											onReset={() => onResetTodo(todo.id)}
											onMoveToOther={() => onMoveTodoToAiGenerated(todo.id)}
											onDelete={() => onDeleteTodo(todo.id)}
										/>
									))
								)}
							</div>
						</SortableContext>
					</CardContent>
				</Card>
			</div>

			<DragOverlay>
				{activeTodo ? <TodoItemOverlay todo={activeTodo} /> : null}
			</DragOverlay>
		</DndContext>
	);
}
