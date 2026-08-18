CREATE TABLE `leaderboard` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_hash` text NOT NULL,
	`nickname` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`successes` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leaderboard_client_hash_unique` ON `leaderboard` (`client_hash`);--> statement-breakpoint
CREATE INDEX `leaderboard_score_idx` ON `leaderboard` (`score`,`successes`,`updated_at`);