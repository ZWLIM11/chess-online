CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`fen` text NOT NULL,
	`host_token` text NOT NULL,
	`guest_token` text,
	`moves` text DEFAULT '[]' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
