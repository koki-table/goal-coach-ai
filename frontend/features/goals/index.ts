// Components
export { GoalForm, GoalStatusForm } from "./components/goalForm";
export { GoalCard } from "./components/goalCard";
export { GoalList } from "./components/goalList";
export { TaskBoard } from "./components/taskBoard";

// Hooks
export { useGoals } from "./hooks/useGoals";

// Schemas
export {
	goalInputSchema,
	goalStatusInputSchema,
	taskInputSchema,
	GoalCategory,
} from "./schemas/goalSchema";

// Types
export type {
	Goal,
	Task,
	GoalStatus,
	TaskBoard as TaskBoardType,
} from "./types";
export { categoryLabels } from "./types";
