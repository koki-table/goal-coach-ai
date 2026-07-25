DROP INDEX `idx_coach_conversations_goal_id`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_coach_conversations_user_goal_id` ON `coach_conversations` (`userId`,`goalId`);