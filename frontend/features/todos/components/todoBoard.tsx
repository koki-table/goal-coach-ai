"use client";

import { Badge } from "@/components/atom/badge";
import { Button } from "@/components/atom/button";
import { CardTitle } from "@/components/atom/card";
import { cn } from "@/lib/utils";
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
import { CaretDown, ListChecks, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { partitionTodos } from "../helpers/todoPartition.helper";
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
	const [isCompletedOpen, setIsCompletedOpen] = useState(false);

	// once かつ完了済みは「完了済み」セクションへ、それ以外はメインリストへ
	const { activeTodos, completedOnceTodos } = partitionTodos(myTodos);

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
		const todo = activeTodos.find((t) => t.id === active.id);
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

		// index は useTodos が splice する全 myTodos 基準で算出する
		// （SortableContext は activeTodos のみだが、完了onceが挟まると部分配列indexがズレるため）
		const sourceList = "myTodos" as const;
		const sourceIndex = myTodos.findIndex((t) => t.id === activeId);

		const destinationList = "myTodos" as const;
		const destinationIndex =
			overId === `my-droppable-${goalId}`
				? myTodos.length
				: myTodos.findIndex((t) => t.id === overId);

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
			{/* TODOセクション（枠なし） */}
			<div>
				<div className="mb-3 flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-sm">
						<ListChecks weight="fill" className="size-4 text-primary" />
						TODO
					</CardTitle>
					<Badge>
						{completedCount}/{totalMyTodos}完了
					</Badge>
				</div>
				<div className="space-y-3">
					<Button variant="outline" size="sm" className="w-full" onClick={() => onAddTodo(goalId)}>
						<Plus weight="bold" className="mr-1" />
						新規追加
					</Button>
					<SortableContext
						id={`my-droppable-${goalId}`}
						items={activeTodos.map((t) => t.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="min-h-24 space-y-2">
							{activeTodos.length === 0 ? (
								<div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
									上のボタンからタスクを追加
								</div>
							) : (
								activeTodos.map((todo) => (
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

					{/* 完了済み（once）セクション — トグルで開閉、D&D対象外 */}
					{completedOnceTodos.length > 0 && (
						<div className="border-border border-t pt-3">
							<button
								type="button"
								onClick={() => setIsCompletedOpen((prev) => !prev)}
								aria-expanded={isCompletedOpen}
								className="flex w-full items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground"
							>
								<CaretDown
									weight="bold"
									className={cn(
										"size-3.5 transition-transform",
										isCompletedOpen ? "" : "-rotate-90",
									)}
								/>
								完了済み ({completedOnceTodos.length})
							</button>
							{isCompletedOpen && (
								<div className="mt-2 space-y-2">
									{completedOnceTodos.map((todo) => (
										<TodoItem
											key={todo.id}
											todo={todo}
											isMyTodo={true}
											milestones={milestones}
											dragDisabled={true}
											onToggleComplete={() => onToggleComplete(todo.id)}
											onDelete={() => onDeleteTodo(todo.id)}
											onEdit={() => onEditTodo(todo)}
										/>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			<DragOverlay>{activeTodo ? <TodoItemOverlay todo={activeTodo} /> : null}</DragOverlay>
		</DndContext>
	);
}
