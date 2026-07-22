CREATE TABLE `coach_evaluation_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`evaluationId` text NOT NULL,
	`content` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`evaluationId`) REFERENCES `coach_evaluations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_coach_eval_suggestions_eval_order` ON `coach_evaluation_suggestions` (`evaluationId`,`sortOrder`);--> statement-breakpoint
CREATE TABLE `coach_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`goalId` text NOT NULL,
	`persona` text DEFAULT 'harsh' NOT NULL,
	`progressPercent` integer NOT NULL,
	`memo` text,
	`obstacles` text,
	`feedback` text NOT NULL,
	`successRate` integer NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_coach_evaluations_goal_created` ON `coach_evaluations` (`goalId`,`createdAt`);