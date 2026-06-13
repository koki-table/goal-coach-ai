"use client";

import { Badge } from "@/components/atom/badge";
import { Button } from "@/components/atom/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atom/card";
import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	closestCorners,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ListChecks, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import type { Milestone, Todo } from "../types";
import { TodoItem, TodoItemOverlay } from "./todoItem";

type TodoBoardProps = {
	myTodos: Todo[];
	milestones: Milestone[];
	goalId: string;
	onToggleComplete: (todoId: string) => void;
	onDeleteTodo: (todoId: string) => void;
	onAddTodo: (goalId: string) => void;
	onEditTodo: (todo: Todo) => void;
	onReorder: (
		sourceList: "aiTodos" | "myTodos",
		sourceIndex: number,
		destinationList: "aiTodos" | "myTodos",
		destinationIndex: number,
		goalId: string,
	) => void;
};

export function TodoBoard({
	myTodos,
	milestones,
	goalId,
	onToggleComplete,
	onDeleteTodo,
	onAddTodo,
	onEditTodo,
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
						<p className="text-xs text-muted-foreground">実行するタスク</p>
					</CardHeader>
					<CardContent className="space-y-3">
						<Button
							variant="outline"
							size="sm"
							className="w-full"
							onClick={() => onAddTodo(goalId)}
						>
							<Plus weight="bold" className="mr-1" />
							新規追加
						</Button>
						<SortableContext
							id={`my-droppable-${goalId}`}
							items={myTodos.map((t) => t.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="min-h-24 space-y-2">
								{myTodos.length === 0 ? (
									<div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
										上のボタンからタスクを追加
									</div>
								) : (
									myTodos.map((todo) => (
										<TodoItem
											key={todo.id}
											todo={todo}
											isMyTodo={true}
											milestones={milestones}
											onToggleComplete={() => onToggleComplete(todo.id)}
											onDelete={() => onDeleteTodo(todo.id)}
											onEdit={() => onEditTodo(todo)}
										/>
									))
								)}
							</div>
						</SortableContext>
					</CardContent>
				</Card>
			</div>

			<DragOverlay>{activeTodo ? <TodoItemOverlay todo={activeTodo} /> : null}</DragOverlay>
		</DndContext>
	);
}
