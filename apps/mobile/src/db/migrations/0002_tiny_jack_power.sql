CREATE TABLE `reader_annotations` (
	`book_id` text NOT NULL,
	`created_at` text NOT NULL,
	`end_offset` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`note` text,
	`section_id` text NOT NULL,
	`selected_text` text NOT NULL,
	`start_offset` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reader_annotations_book_id_idx` ON `reader_annotations` (`book_id`);