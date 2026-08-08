CREATE TABLE `processed_stripe_events` (
	`id` text PRIMARY KEY NOT NULL,
	`eventType` text NOT NULL,
	`processedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`stripeCustomerId` text NOT NULL,
	`stripeSubscriptionId` text,
	`stripePriceId` text,
	`tier` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`currentPeriodEnd` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_user_subscriptions_tier" CHECK("user_subscriptions"."tier" IN ('free','pro')),
	CONSTRAINT "chk_user_subscriptions_status" CHECK("user_subscriptions"."status" IN ('active','past_due','canceled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_subscriptions_user_id` ON `user_subscriptions` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_subscriptions_stripe_customer_id` ON `user_subscriptions` (`stripeCustomerId`);--> statement-breakpoint
ALTER TABLE `coach_messages` ADD `model` text;