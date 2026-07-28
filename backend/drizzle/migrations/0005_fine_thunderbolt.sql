ALTER TABLE `milestones` ADD `startValue` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `milestones` ADD `currentValue` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `milestones` ADD `targetValue` real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `milestones` ADD `unit` text DEFAULT '' NOT NULL;--> statement-breakpoint
-- 既存の完了済みKRを100%(current=target=1)にbackfill。ADD COLUMNのdefaultは全行current=0のため、
-- そのままだと完了済みKRが0%表示になるのを防ぐ。
UPDATE `milestones` SET `currentValue` = 1, `targetValue` = 1 WHERE `isCompleted` = 1;