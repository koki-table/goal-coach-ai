"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/atom/dialog";
import { TodoEditForm, type TodoEditFormProps } from "./todoEditForm";

type TodoEditModalProps = TodoEditFormProps;

export function TodoEditModal(props: TodoEditModalProps) {
	const { mode, isOpen, onClose } = props;

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose();
		}
	};

	const dialogTitle = mode === "create" ? "TODO新規作成" : "TODO編集";
	const dialogDescription =
		mode === "create" ? "新しいタスクを作成します" : "タスクの詳細を編集します";

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{dialogTitle}</DialogTitle>
					<DialogDescription>{dialogDescription}</DialogDescription>
				</DialogHeader>
				<TodoEditForm {...props} />
			</DialogContent>
		</Dialog>
	);
}
