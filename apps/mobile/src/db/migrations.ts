import journal from "./migrations/meta/_journal.json";

const initialMigration = `CREATE TABLE \`import_books\` (
  \`author\` text,
  \`converted_epub_uri\` text,
  \`cover_file_name\` text,
  \`epub_structure_version\` integer,
  \`exported_uri\` text,
  \`file_size\` integer,
  \`format\` text NOT NULL,
  \`id\` text PRIMARY KEY NOT NULL,
  \`imported_at\` text NOT NULL,
  \`modified_at\` text NOT NULL,
  \`page_count\` integer,
  \`source_file_name\` text NOT NULL,
  \`title\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`import_locations\` (
  \`book_id\` text NOT NULL,
  \`end_offset\` integer,
  \`excerpt\` text NOT NULL,
  \`fragment\` text,
  \`href\` text NOT NULL,
  \`position\` integer NOT NULL,
  \`source_index\` integer NOT NULL,
  \`start_offset\` integer,
  \`title\` text NOT NULL,
  PRIMARY KEY(\`book_id\`, \`position\`)
);
--> statement-breakpoint
CREATE TABLE \`import_sections\` (
  \`book_id\` text NOT NULL,
  \`end_location\` integer,
  \`end_page\` integer,
  \`href\` text,
  \`id\` text NOT NULL,
  \`included\` integer NOT NULL,
  \`position\` integer NOT NULL,
  \`start_location\` integer,
  \`start_page\` integer,
  \`title\` text NOT NULL,
  PRIMARY KEY(\`book_id\`, \`id\`)
);
--> statement-breakpoint
CREATE TABLE \`library_books\` (
  \`author\` text,
  \`converted_epub_uri\` text,
  \`cover_file_name\` text,
  \`epub_structure_version\` integer,
  \`exported_uri\` text,
  \`file_size\` integer,
  \`format\` text NOT NULL,
  \`id\` text PRIMARY KEY NOT NULL,
  \`imported_at\` text NOT NULL,
  \`modified_at\` text NOT NULL,
  \`page_count\` integer,
  \`source_file_name\` text NOT NULL,
  \`title\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`library_locations\` (
  \`book_id\` text NOT NULL,
  \`end_offset\` integer,
  \`excerpt\` text NOT NULL,
  \`fragment\` text,
  \`href\` text NOT NULL,
  \`position\` integer NOT NULL,
  \`source_index\` integer NOT NULL,
  \`start_offset\` integer,
  \`title\` text NOT NULL,
  PRIMARY KEY(\`book_id\`, \`position\`)
);
--> statement-breakpoint
CREATE TABLE \`library_sections\` (
  \`book_id\` text NOT NULL,
  \`end_location\` integer,
  \`end_page\` integer,
  \`href\` text,
  \`id\` text NOT NULL,
  \`included\` integer NOT NULL,
  \`position\` integer NOT NULL,
  \`start_location\` integer,
  \`start_page\` integer,
  \`title\` text NOT NULL,
  PRIMARY KEY(\`book_id\`, \`id\`)
);
--> statement-breakpoint
CREATE TABLE \`reading_progress\` (
  \`book_id\` text PRIMARY KEY NOT NULL,
  \`pdf_page\` integer,
  \`scroll_progress\` real DEFAULT 0 NOT NULL,
  \`section_id\` text,
  \`section_index\` integer DEFAULT 0 NOT NULL,
  \`updated_at\` text NOT NULL
);`;

const epubLocationsMigration = `ALTER TABLE \`import_books\` ADD \`epub_locations\` text;
--> statement-breakpoint
ALTER TABLE \`library_books\` ADD \`epub_locations\` text;
--> statement-breakpoint
UPDATE \`import_books\`
SET \`epub_locations\` = (
  SELECT json_group_array(json_object(
    'href', \`href\`,
    'index', \`source_index\`,
    'title', \`title\`,
    'excerpt', \`excerpt\`,
    'fragment', \`fragment\`,
    'startOffset', \`start_offset\`,
    'endOffset', \`end_offset\`
  ))
  FROM (SELECT * FROM \`import_locations\` WHERE \`book_id\` = \`import_books\`.\`id\` ORDER BY \`position\`)
)
WHERE EXISTS (SELECT 1 FROM \`import_locations\` WHERE \`book_id\` = \`import_books\`.\`id\`);
--> statement-breakpoint
UPDATE \`library_books\`
SET \`epub_locations\` = (
  SELECT json_group_array(json_object(
    'href', \`href\`,
    'index', \`source_index\`,
    'title', \`title\`,
    'excerpt', \`excerpt\`,
    'fragment', \`fragment\`,
    'startOffset', \`start_offset\`,
    'endOffset', \`end_offset\`
  ))
  FROM (SELECT * FROM \`library_locations\` WHERE \`book_id\` = \`library_books\`.\`id\` ORDER BY \`position\`)
)
WHERE EXISTS (SELECT 1 FROM \`library_locations\` WHERE \`book_id\` = \`library_books\`.\`id\`);
--> statement-breakpoint
DROP TABLE \`import_locations\`;
--> statement-breakpoint
DROP TABLE \`library_locations\`;`;

const readerAnnotationsMigration = `CREATE TABLE \`reader_annotations\` (
  \`book_id\` text NOT NULL,
  \`created_at\` text NOT NULL,
  \`end_offset\` integer NOT NULL,
  \`id\` text PRIMARY KEY NOT NULL,
  \`kind\` text NOT NULL,
  \`note\` text,
  \`section_id\` text NOT NULL,
  \`selected_text\` text NOT NULL,
  \`start_offset\` integer NOT NULL,
  \`updated_at\` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX \`reader_annotations_book_id_idx\` ON \`reader_annotations\` (\`book_id\`);`;

export default {
  journal,
  migrations: {
    m0000: initialMigration,
    m0001: epubLocationsMigration,
    m0002: readerAnnotationsMigration,
  },
};
