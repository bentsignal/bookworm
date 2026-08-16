import type { BookRecord, BookSection } from "@lib/ebook-core";
import { sectionLocationRange } from "@lib/ebook-core";

export function initialChapterRange(book: BookRecord, section: BookSection) {
  if (book.format === "pdf") {
    return {
      start: section.startPage ?? 1,
      end: section.endPage ?? section.startPage ?? 1,
    };
  }
  const range = sectionLocationRange(section, book.epubLocations ?? []);
  return { start: range.start + 1, end: range.end + 1 };
}

export function updateChapter(input: {
  book: BookRecord;
  end: number;
  section: BookSection;
  start: number;
  title: string;
}) {
  const title = nonBlank(input.title, "Untitled chapter");
  if (input.book.format === "pdf") {
    return {
      ...input.section,
      title,
      startPage: input.start,
      endPage: input.end,
    };
  }
  const location = input.book.epubLocations?.[input.start - 1];
  return {
    ...input.section,
    title,
    href: location?.href ?? input.section.href,
    startLocation: input.start - 1,
    endLocation: input.end - 1,
  };
}

export function chapterLocationLabel(
  format: BookRecord["format"],
  value: number,
) {
  return format === "pdf" ? `page ${value}` : `text ${value}`;
}

export function epubLocationCount(book: BookRecord) {
  return Math.max(1, book.epubLocations?.length ?? 0);
}

function nonBlank(value: string, fallback: string) {
  return value.trim() ? value.trim() : fallback;
}
