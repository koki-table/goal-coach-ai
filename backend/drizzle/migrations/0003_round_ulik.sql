CREATE TABLE `coach_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`goalId` text,
	`goalTitleSnapshot` text NOT NULL,
	`goalDeadlineSnapshot` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_coach_conversations_user_id` ON `coach_conversations` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_coach_conversations_goal_id` ON `coach_conversations` (`goalId`);--> statement-breakpoint
CREATE TABLE `coach_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversationId` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`proposal` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`conversationId`) REFERENCES `coach_conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_coach_messages_conversation_id` ON `coach_messages` (`conversationId`,`id`);