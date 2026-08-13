CREATE TABLE `coach_daily_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`goalId` text NOT NULL,
	`reviewDate` text NOT NULL,
	`messageId` integer,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`messageId`) REFERENCES `coach_messages`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_coach_daily_reviews_goal_date` ON `coach_daily_reviews` (`goalId`,`reviewDate`);