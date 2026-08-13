CREATE TABLE `app_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_books` (
	`author` text,
	`converted_epub_uri` text,
	`cover_file_name` text,
	`epub_structure_version` integer,
	`exported_uri` text,
	`file_size` integer,
	`format` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`imported_at` text NOT NULL,
	`modified_at` text NOT NULL,
	`page_count` integer,
	`source_file_name` text NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_locations` (
	`book_id` text NOT NULL,
	`end_offset` integer,
	`excerpt` text NOT NULL,
	`fragment` text,
	`href` text NOT NULL,
	`position` integer NOT NULL,
	`source_index` integer NOT NULL,
	`start_offset` integer,
	`title` text NOT NULL,
	PRIMARY KEY(`book_id`, `position`)
);
--> statement-breakpoint
CREATE TABLE `import_sections` (
	`book_id` text NOT NULL,
	`end_location` integer,
	`end_page` integer,
	`href` text,
	`id` text NOT NULL,
	`included` integer NOT NULL,
	`position` integer NOT NULL,
	`start_location` integer,
	`start_page` integer,
	`title` text NOT NULL,
	PRIMARY KEY(`book_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `library_books` (
	`author` text,
	`converted_epub_uri` text,
	`cover_file_name` text,
	`epub_structure_version` integer,
	`exported_uri` text,
	`file_size` integer,
	`format` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`imported_at` text NOT NULL,
	`modified_at` text NOT NULL,
	`page_count` integer,
	`source_file_name` text NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `library_locations` (
	`book_id` text NOT NULL,
	`end_offset` integer,
	`excerpt` text NOT NULL,
	`fragment` text,
	`href` text NOT NULL,
	`position` integer NOT NULL,
	`source_index` integer NOT NULL,
	`start_offset` integer,
	`title` text NOT NULL,
	PRIMARY KEY(`book_id`, `position`)
);
--> statement-breakpoint
CREATE TABLE `library_sections` (
	`book_id` text NOT NULL,
	`end_location` integer,
	`end_page` integer,
	`href` text,
	`id` text NOT NULL,
	`included` integer NOT NULL,
	`position` integer NOT NULL,
	`start_location` integer,
	`start_page` integer,
	`title` text NOT NULL,
	PRIMARY KEY(`book_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`book_id` text PRIMARY KEY NOT NULL,
	`pdf_page` integer,
	`scroll_progress` real DEFAULT 0 NOT NULL,
	`section_id` text,
	`section_index` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
