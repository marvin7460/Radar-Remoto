CREATE TABLE `fx_rates` (
	`date` text NOT NULL,
	`base` text NOT NULL,
	`quote` text NOT NULL,
	`rate` real NOT NULL,
	`fetched_at` integer NOT NULL,
	PRIMARY KEY(`date`, `base`, `quote`)
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `accepts_mexico` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `jobs` ADD `eligibility_reason` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `salary_usd_monthly_min` real;--> statement-breakpoint
ALTER TABLE `jobs` ADD `salary_usd_monthly_max` real;--> statement-breakpoint
ALTER TABLE `jobs` ADD `canonical_job_id` integer;--> statement-breakpoint
CREATE INDEX `jobs_canonical_job_id_idx` ON `jobs` (`canonical_job_id`);