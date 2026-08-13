import { Directory, File, Paths } from "expo-file-system";

import type { BookAnalysis, BookRecord } from "@worm/ebook-core";
import {
  analyzeBook,
  cleanEpubLocations,
  createEditionFileName,
  EPUB_STRUCTURE_VERSION,
  extractEpubCover,
  remapEpubSections,
} from "@worm/ebook-core";

import type { BookScope } from "~/db/catalog";

const libraryDirectory = new Directory(Paths.document, "Library");
const importDirectory = new Directory(Paths.document, "Imports");
const catalogFile = new File(libraryDirectory, "library.json");

export async function loadLibrary() {
  ensureLibraryDirectory();
  if (!catalogFile.exists) return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- JSON.parse is validated by the type guard before use.
    const stored = JSON.parse(await catalogFile.text());
    return isBookRecordArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export async function importBook(
  source: File,
  id: string,
  analyzed?: BookAnalysis,
  scope: BookScope = "library",
) {
  const bytes = await source.bytes();
  const analysis = analyzed ?? (await analyzeBook(bytes, source.name));
  const bookDirectory = bookDirectoryFor(id, scope);
  bookDirectory.create({ idempotent: true, intermediates: true });
  try {
    const destination = new File(bookDirectory, safeFileName(source.name));
    await source.copy(destination, { overwrite: false });
    const coverFileName =
      analysis.format === "epub"
        ? await writeExtractedEpubCover(bookDirectory, bytes)
        : undefined;
    const now = new Date().toISOString();
    return {
      ...analysis,
      id,
      sourceFileName: destination.name,
      coverFileName,
      importedAt: now,
      modifiedAt: now,
      fileSize: destination.size,
    } satisfies BookRecord;
  } catch (error) {
    if (bookDirectory.exists) bookDirectory.delete();
    throw error;
  }
}

export function saveLibrary(books: BookRecord[]) {
  ensureLibraryDirectory();
  if (!catalogFile.exists) catalogFile.create();
  catalogFile.write(JSON.stringify(books, null, 2));
}

export function deleteBookFiles(book: BookRecord) {
  deleteStoredBookFiles(book, "library");
}

export function deleteStoredBookFiles(book: BookRecord, scope: BookScope) {
  const directory = bookDirectoryFor(book.id, scope);
  if (directory.exists) directory.delete();
}

export async function copyImportToLibrary(book: BookRecord) {
  const destination = bookDirectoryFor(book.id, "library");
  destination.create({ idempotent: true, intermediates: true });
  try {
    await getSourceFile(book, "import").copy(
      new File(destination, book.sourceFileName),
      { overwrite: false },
    );
    const cover = getCoverFile(book, "import");
    if (cover?.exists && book.coverFileName) {
      await cover.copy(new File(destination, book.coverFileName), {
        overwrite: false,
      });
    }
  } catch (error) {
    if (destination.exists) destination.delete();
    throw error;
  }
}

export function editionDestination(book: BookRecord) {
  return new File(
    libraryDirectory,
    book.id,
    createEditionFileName(book.title, book.format),
  );
}

export function convertedEpubDestination(book: BookRecord) {
  return new File(
    libraryDirectory,
    book.id,
    createEditionFileName(book.title, "epub"),
  );
}

export function getSourceFile(book: BookRecord, scope: BookScope = "library") {
  return new File(bookDirectoryFor(book.id, scope), book.sourceFileName);
}

export function getCoverFile(book: BookRecord, scope: BookScope = "library") {
  if (!book.coverFileName) return undefined;
  return new File(bookDirectoryFor(book.id, scope), book.coverFileName);
}

export function coverDestination(
  book: BookRecord,
  extension: string,
  scope: BookScope = "library",
) {
  return new File(
    bookDirectoryFor(book.id, scope),
    `cover.${extension.replaceAll(/[^a-z0-9]/giu, "").toLowerCase() || "jpg"}`,
  );
}

export async function refreshEpubMetadata(
  book: BookRecord,
  scope: BookScope = "library",
) {
  if (book.format !== "epub") return book;
  const refreshStructure = book.epubStructureVersion !== EPUB_STRUCTURE_VERSION;
  const migrated = migrateCachedEpubMetadata(book);
  if (migrated) return migrated;
  const bytes = await getSourceFile(book, scope).bytes();
  const analysis = await analyzeBook(bytes, book.sourceFileName);
  const coverFileName =
    book.coverFileName ??
    (await writeExtractedEpubCover(bookDirectoryFor(book.id, scope), bytes));
  return {
    ...book,
    coverFileName,
    epubStructureVersion:
      analysis.format === "epub"
        ? analysis.epubStructureVersion
        : book.epubStructureVersion,
    epubLocations:
      analysis.format === "epub" ? analysis.epubLocations : book.epubLocations,
    sections:
      refreshStructure && analysis.format === "epub"
        ? analysis.sections
        : book.sections,
  };
}

function migrateCachedEpubMetadata(book: BookRecord) {
  if (book.epubStructureVersion !== 2 || !book.epubLocations?.length) return;
  const epubLocations = cleanEpubLocations(book.epubLocations);
  return {
    ...book,
    epubLocations,
    epubStructureVersion: EPUB_STRUCTURE_VERSION,
    sections: remapEpubSections(
      book.sections,
      book.epubLocations,
      epubLocations,
    ),
  } satisfies BookRecord;
}

function ensureLibraryDirectory() {
  libraryDirectory.create({ idempotent: true, intermediates: true });
  importDirectory.create({ idempotent: true, intermediates: true });
}

function bookDirectoryFor(id: string, scope: BookScope) {
  ensureLibraryDirectory();
  return new Directory(
    scope === "library" ? libraryDirectory : importDirectory,
    id,
  );
}

function safeFileName(fileName: string) {
  return fileName.replaceAll(/[\\/:*?"<>|]/gu, "-");
}

async function writeExtractedEpubCover(
  bookDirectory: Directory,
  bytes: Uint8Array,
) {
  const cover = await extractEpubCover(bytes);
  if (!cover) return undefined;
  const destination = new File(bookDirectory, `cover.${cover.extension}`);
  if (destination.exists) destination.delete();
  destination.create();
  destination.write(cover.bytes);
  return destination.name;
}

function isBookRecordArray(value: unknown): value is BookRecord[] {
  return Array.isArray(value) && value.every(isBookRecord);
}

function isBookRecord(value: unknown): value is BookRecord {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "sourceFileName" in value &&
    typeof value.sourceFileName === "string" &&
    "sections" in value &&
    Array.isArray(value.sections)
  );
}
