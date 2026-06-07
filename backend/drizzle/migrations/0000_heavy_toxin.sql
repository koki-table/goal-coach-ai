CREATE TABLE `goal_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_goal_categories_user_id` ON `goal_categories` (`userId`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`categoryId` text,
	`status` text DEFAULT 'active' NOT NULL,
	`dueDate` text,
	`completedAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `goal_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_goals_user_id` ON `goals` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_goals_user_status` ON `goals` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_goals_due_date` ON `goals` (`dueDate`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`goalId` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`label` text,
	`dueDate` text,
	`isCompleted` integer DEFAULT 0 NOT NULL,
	`completedAt` text,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_milestones_goal_id` ON `milestones` (`goalId`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_milestones_id_goal_id` ON `milestones` (`id`,`goalId`);--> statement-breakpoint
CREATE TABLE `todo_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`todoId` text NOT NULL,
	`type` text NOT NULL,
	`durationMinutes` integer,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`todoId`) REFERENCES `todos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_todo_logs_todo_id` ON `todo_logs` (`todoId`);--> statement-breakpoint
CREATE INDEX `idx_todo_logs_created_at` ON `todo_logs` (`createdAt`);--> statement-breakpoint
CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`goalId` text NOT NULL,
	`milestoneId` text,
	`title` text NOT NULL,
	`description` text,
	`isCompleted` integer DEFAULT 0 NOT NULL,
	`completedAt` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`dueDate` text,
	`estimatedMinutes` integer,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`milestoneId`,`goalId`) REFERENCES `milestones`(`id`,`goalId`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_todos_goal_id` ON `todos` (`goalId`);--> statement-breakpoint
CREATE INDEX `idx_todos_milestone_id` ON `todos` (`milestoneId`);--> statement-breakpoint
CREATE INDEX `idx_todos_due_date` ON `todos` (`dueDate`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`authId` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_auth_id` ON `users` (`authId`);