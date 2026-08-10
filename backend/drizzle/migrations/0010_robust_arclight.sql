CREATE TABLE `coach_daily_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`date` text NOT NULL,
	`decidedCount` integer DEFAULT 0 NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_coach_daily_usage_user_date` ON `coach_daily_usage` (`userId`,`date`);--> statement-breakpoint
ALTER TABLE `user_subscriptions` ADD `lastEventCreatedAt` text;