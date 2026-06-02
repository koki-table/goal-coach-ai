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
import { ListChecks, Plus } from "@phosphor-icons/react";
import type { Todo } from "../types";
import type { TodoInput } from "../schemas/todoSchema";
import { TodoItem, TodoItemOverlay } from "./todoItem";

type TodoBoardProps = {
	myTodos: Todo[];
	goalId: string;
	onToggleComplete: (todoId: string) => void;
	onDeleteTodo: (todoId: string) => void;
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
	myTodos,
	goalId,
	onToggleComplete,
	onDeleteTodo,
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
		const todo = myTodos.find((t) => t.id === active.id);
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

		const sourceList = "myTodos" as const;
		const sourceIndex = myTodos.findIndex((t) => t.id === activeId);

		let destinationList: "aiTodos" | "myTodos";
		let destinationIndex: number;

		if (overId === `my-droppable-${goalId}`) {
			destinationList = "myTodos";
			destinationIndex = myTodos.length;
		} else {
			destinationList = "myTodos";
			destinationIndex = myTodos.findIndex((t) => t.id === overId);
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
			<div className="grid gap-4">
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
										上のフォームからタスクを追加
									</div>
								) : (
									myTodos.map((todo) => (
										<TodoItem
											key={todo.id}
											todo={todo}
											isMyTodo={true}
											onToggleComplete={() => onToggleComplete(todo.id)}
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
