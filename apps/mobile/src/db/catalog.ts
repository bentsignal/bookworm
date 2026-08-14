import { asc, desc, eq } from "drizzle-orm";

import type { BookRecord, BookSection, EpubLocation } from "@worm/ebook-core";

import { db } from "./database";
import {
  importBooks,
  importLocations,
  importSections,
  libraryBooks,
  libraryLocations,
  librarySections,
  readingProgress,
} from "./schema";

export type BookScope = "import" | "library";
export type ReadingProgress = typeof readingProgress.$inferSelect;

export async function insertBook(book: BookRecord, scope: BookScope) {
  await db.transaction(async (transaction) => {
    if (scope === "library") {
      await transaction.insert(libraryBooks).values(bookValues(book));
      if (book.sections.length > 0) {
        await transaction
          .insert(librarySections)
          .values(sectionValues(book.id, book.sections));
      }
      if (book.epubLocations?.length) {
        await transaction
          .insert(libraryLocations)
          .values(locationValues(book.id, book.epubLocations));
      }
      return;
    }
    await transaction.insert(importBooks).values(bookValues(book));
    if (book.sections.length > 0) {
      await transaction
        .insert(importSections)
        .values(sectionValues(book.id, book.sections));
    }
    if (book.epubLocations?.length) {
      await transaction
        .insert(importLocations)
        .values(locationValues(book.id, book.epubLocations));
    }
  });
}

export async function updateStoredBook(
  book: BookRecord,
  update: Partial<BookRecord>,
  scope: BookScope,
) {
  const next = {
    ...book,
    ...update,
    modifiedAt: new Date().toISOString(),
  };
  // eslint-disable-next-line complexity -- The two intentionally parallel table families keep import edits isolated from the library.
  await db.transaction(async (transaction) => {
    if (scope === "library") {
      await transaction
        .update(libraryBooks)
        .set(bookValues(next))
        .where(eq(libraryBooks.id, book.id));
      if (update.sections) {
        await transaction
          .delete(librarySections)
          .where(eq(librarySections.bookId, book.id));
        if (next.sections.length > 0) {
          await transaction
            .insert(librarySections)
            .values(sectionValues(book.id, next.sections));
        }
      }
      if (update.epubLocations) {
        await transaction
          .delete(libraryLocations)
          .where(eq(libraryLocations.bookId, book.id));
        if (next.epubLocations?.length) {
          await transaction
            .insert(libraryLocations)
            .values(locationValues(book.id, next.epubLocations));
        }
      }
      return;
    }
    await transaction
      .update(importBooks)
      .set(bookValues(next))
      .where(eq(importBooks.id, book.id));
    if (update.sections) {
      await transaction
        .delete(importSections)
        .where(eq(importSections.bookId, book.id));
      if (next.sections.length > 0) {
        await transaction
          .insert(importSections)
          .values(sectionValues(book.id, next.sections));
      }
    }
    if (update.epubLocations) {
      await transaction
        .delete(importLocations)
        .where(eq(importLocations.bookId, book.id));
      if (next.epubLocations?.length) {
        await transaction
          .insert(importLocations)
          .values(locationValues(book.id, next.epubLocations));
      }
    }
  });
}

export async function removeStoredBook(id: string, scope: BookScope) {
  await db.transaction(async (transaction) => {
    if (scope === "library") {
      await transaction
        .delete(librarySections)
        .where(eq(librarySections.bookId, id));
      await transaction
        .delete(libraryLocations)
        .where(eq(libraryLocations.bookId, id));
      await transaction
        .delete(readingProgress)
        .where(eq(readingProgress.bookId, id));
      await transaction.delete(libraryBooks).where(eq(libraryBooks.id, id));
      return;
    }
    await transaction
      .delete(importSections)
      .where(eq(importSections.bookId, id));
    await transaction
      .delete(importLocations)
      .where(eq(importLocations.bookId, id));
    await transaction.delete(importBooks).where(eq(importBooks.id, id));
  });
}

// eslint-disable-next-line complexity -- A partial progress update preserves each format's independent position fields.
export function saveReadingProgress(
  bookId: string,
  update: Partial<
    Pick<
      ReadingProgress,
      "pdfPage" | "scrollProgress" | "sectionId" | "sectionIndex"
    >
  >,
) {
  const current = db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.bookId, bookId))
    .get();
  const value = {
    bookId,
    pdfPage: update.pdfPage ?? current?.pdfPage,
    scrollProgress: update.scrollProgress ?? current?.scrollProgress ?? 0,
    sectionId: update.sectionId ?? current?.sectionId,
    sectionIndex: update.sectionIndex ?? current?.sectionIndex ?? 0,
    updatedAt: new Date().toISOString(),
  };
  db.insert(readingProgress)
    .values(value)
    .onConflictDoUpdate({ target: readingProgress.bookId, set: value })
    .run();
}

export function getReadingProgress(bookId: string) {
  return db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.bookId, bookId))
    .get();
}

export function libraryQueries() {
  return {
    books: db
      .select()
      .from(libraryBooks)
      .orderBy(desc(libraryBooks.importedAt)),
    locations: db
      .select()
      .from(libraryLocations)
      .orderBy(asc(libraryLocations.bookId), asc(libraryLocations.position)),
    sections: db
      .select()
      .from(librarySections)
      .orderBy(asc(librarySections.bookId), asc(librarySections.position)),
  };
}

export function importQueries() {
  return {
    books: db.select().from(importBooks).orderBy(asc(importBooks.importedAt)),
    locations: db
      .select()
      .from(importLocations)
      .orderBy(asc(importLocations.bookId), asc(importLocations.position)),
    sections: db
      .select()
      .from(importSections)
      .orderBy(asc(importSections.bookId), asc(importSections.position)),
  };
}

export function hydrateBooks(
  bookRows: (typeof libraryBooks.$inferSelect)[],
  sectionRows: (typeof librarySections.$inferSelect)[],
  locationRows: (typeof libraryLocations.$inferSelect)[],
) {
  return bookRows.map((row) => ({
    author: row.author ?? undefined,
    convertedEpubUri: row.convertedEpubUri ?? undefined,
    coverFileName: row.coverFileName ?? undefined,
    epubLocations: toLocations(
      locationRows.filter((item) => item.bookId === row.id),
    ),
    epubStructureVersion: row.epubStructureVersion ?? undefined,
    exportedUri: row.exportedUri ?? undefined,
    fileSize: row.fileSize ?? undefined,
    format: row.format,
    id: row.id,
    importedAt: row.importedAt,
    modifiedAt: row.modifiedAt,
    pageCount: row.pageCount ?? undefined,
    sections: toSections(sectionRows.filter((item) => item.bookId === row.id)),
    sourceFileName: row.sourceFileName,
    title: row.title,
  })) satisfies BookRecord[];
}

function bookValues(book: BookRecord) {
  return {
    author: book.author,
    convertedEpubUri: book.convertedEpubUri,
    coverFileName: book.coverFileName,
    epubStructureVersion: book.epubStructureVersion,
    exportedUri: book.exportedUri,
    fileSize: book.fileSize,
    format: book.format,
    id: book.id,
    importedAt: book.importedAt,
    modifiedAt: book.modifiedAt,
    pageCount: book.pageCount,
    sourceFileName: book.sourceFileName,
    title: book.title,
  };
}

function sectionValues(bookId: string, sections: BookSection[]) {
  return sections.map((section, position) => ({
    bookId,
    endLocation: section.endLocation,
    endPage: section.endPage,
    href: section.href,
    id: section.id,
    included: section.included,
    position,
    startLocation: section.startLocation,
    startPage: section.startPage,
    title: section.title,
  }));
}

function locationValues(bookId: string, locations: EpubLocation[]) {
  return locations.map((location, position) => ({
    bookId,
    endOffset: location.endOffset,
    excerpt: location.excerpt,
    fragment: location.fragment,
    href: location.href,
    position,
    sourceIndex: location.index,
    startOffset: location.startOffset,
    title: location.title,
  }));
}

function toSections(rows: (typeof librarySections.$inferSelect)[]) {
  return rows.map((row) => ({
    endLocation: row.endLocation ?? undefined,
    endPage: row.endPage ?? undefined,
    href: row.href ?? undefined,
    id: row.id,
    included: row.included,
    startLocation: row.startLocation ?? undefined,
    startPage: row.startPage ?? undefined,
    title: row.title,
  }));
}

function toLocations(rows: (typeof libraryLocations.$inferSelect)[]) {
  if (rows.length === 0) return undefined;
  return rows.map((row) => ({
    endOffset: row.endOffset ?? undefined,
    excerpt: row.excerpt,
    fragment: row.fragment ?? undefined,
    href: row.href,
    index: row.sourceIndex,
    startOffset: row.startOffset ?? undefined,
    title: row.title,
  }));
}
