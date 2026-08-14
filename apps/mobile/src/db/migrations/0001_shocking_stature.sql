ALTER TABLE `import_books` ADD `epub_locations` text;--> statement-breakpoint
ALTER TABLE `library_books` ADD `epub_locations` text;--> statement-breakpoint
UPDATE `import_books`
SET `epub_locations` = (
	SELECT json_group_array(json_object(
		'href', `href`,
		'index', `source_index`,
		'title', `title`,
		'excerpt', `excerpt`,
		'fragment', `fragment`,
		'startOffset', `start_offset`,
		'endOffset', `end_offset`
	))
	FROM (SELECT * FROM `import_locations` WHERE `book_id` = `import_books`.`id` ORDER BY `position`)
)
WHERE EXISTS (SELECT 1 FROM `import_locations` WHERE `book_id` = `import_books`.`id`);--> statement-breakpoint
UPDATE `library_books`
SET `epub_locations` = (
	SELECT json_group_array(json_object(
		'href', `href`,
		'index', `source_index`,
		'title', `title`,
		'excerpt', `excerpt`,
		'fragment', `fragment`,
		'startOffset', `start_offset`,
		'endOffset', `end_offset`
	))
	FROM (SELECT * FROM `library_locations` WHERE `book_id` = `library_books`.`id` ORDER BY `position`)
)
WHERE EXISTS (SELECT 1 FROM `library_locations` WHERE `book_id` = `library_books`.`id`);--> statement-breakpoint
DROP TABLE `import_locations`;--> statement-breakpoint
DROP TABLE `library_locations`;
