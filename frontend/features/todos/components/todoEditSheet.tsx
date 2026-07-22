"use client";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/atom/sheet";
import { TodoEditForm, type TodoEditFormProps } from "./todoEditForm";

type TodoEditSheetProps = TodoEditFormProps;

export function TodoEditSheet(props: TodoEditSheetProps) {
	const { mode, isOpen, onClose } = props;

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			onClose();
		}
	};

	const sheetTitle = mode === "create" ? "TODO新規作成" : "TODO編集";
	const sheetDescription =
		mode === "create" ? "新しいタスクを作成します" : "タスクの詳細を編集します";

	return (
		<Sheet open={isOpen} onOpenChange={handleOpenChange}>
			<SheetContent side="right" className="overflow-y-auto sm:max-w-md">
				<SheetHeader>
					<SheetTitle>{sheetTitle}</SheetTitle>
					<SheetDescription>{sheetDescription}</SheetDescription>
				</SheetHeader>
				<TodoEditForm {...props} />
			</SheetContent>
		</Sheet>
	);
}
