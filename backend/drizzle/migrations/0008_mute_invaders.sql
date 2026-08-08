PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_coach_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`goalId` text,
	`objectiveStatus` text DEFAULT 'decided' NOT NULL,
	`goalTitleSnapshot` text NOT NULL,
	`goalDeadlineSnapshot` text,
	`phase` text DEFAULT 'theme' NOT NULL,
	`turnsInPhase` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "chk_coach_conversations_objective_status" CHECK("__new_coach_conversations"."objectiveStatus" IN ('decided', 'undecided')),
	CONSTRAINT "chk_coach_conversations_phase" CHECK("__new_coach_conversations"."phase" IN ('theme', 'reality', 'insight', 'action', 'closed'))
);
--> statement-breakpoint
INSERT INTO `__new_coach_conversations`("id", "userId", "goalId", "objectiveStatus", "goalTitleSnapshot", "goalDeadlineSnapshot", "phase", "turnsInPhase", "createdAt", "updatedAt") SELECT "id", "userId", "goalId", "objectiveStatus", "goalTitleSnapshot", "goalDeadlineSnapshot", 'theme', 0, "createdAt", "updatedAt" FROM `coach_conversations`;--> statement-breakpoint
DROP TABLE `coach_conversations`;--> statement-breakpoint
ALTER TABLE `__new_coach_conversations` RENAME TO `coach_conversations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_coach_conversations_user_id` ON `coach_conversations` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_coach_conversations_user_goal_id` ON `coach_conversations` (`userId`,`goalId`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_coach_conversations_user_undecided_objective` ON `coach_conversations` (`userId`) WHERE "coach_conversations"."objectiveStatus" = 'undecided' AND "coach_conversations"."goalId" IS NULL;