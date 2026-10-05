CREATE TABLE `job_labels` (
	`job_id` integer PRIMARY KEY NOT NULL,
	`seniority` text NOT NULL,
	`accepts_mexico` text NOT NULL,
	`labeled_at` integer NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `seniority_reason` text;