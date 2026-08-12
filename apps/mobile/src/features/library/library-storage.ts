import { Directory, File, Paths } from "expo-file-system";

import type { BookRecord } from "@worm/ebook-core";
import {
  analyzeBook,
  createEditionFileName,
  extractEpubCover,
} from "@worm/ebook-core";

const libraryDirectory = new Directory(Paths.document, "Library");
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

export async function importBook(source: File, id: string) {
  const bytes = await source.bytes();
  const analysis = await analyzeBook(bytes, source.name);
  const bookDirectory = new Directory(libraryDirectory, id);
  bookDirectory.create({ idempotent: true, intermediates: true });
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
}

export function saveLibrary(books: BookRecord[]) {
  ensureLibraryDirectory();
  if (!catalogFile.exists) catalogFile.create();
  catalogFile.write(JSON.stringify(books, null, 2));
}

export function deleteBookFiles(book: BookRecord) {
  const directory = new Directory(libraryDirectory, book.id);
  if (directory.exists) directory.delete();
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

export function getSourceFile(book: BookRecord) {
  return new File(libraryDirectory, book.id, book.sourceFileName);
}

export function getCoverFile(book: BookRecord) {
  if (!book.coverFileName) return undefined;
  return new File(libraryDirectory, book.id, book.coverFileName);
}

export function coverDestination(book: BookRecord, extension: string) {
  return new File(
    libraryDirectory,
    book.id,
    `cover.${extension.replaceAll(/[^a-z0-9]/giu, "").toLowerCase() || "jpg"}`,
  );
}

export async function refreshEpubMetadata(book: BookRecord) {
  if (book.format !== "epub") return book;
  const refreshStructure =
    !book.epubLocations ||
    book.epubLocations.some(
      (location) =>
        location.startOffset === undefined || location.endOffset === undefined,
    );
  const bytes = await getSourceFile(book).bytes();
  const analysis = await analyzeBook(bytes, book.sourceFileName);
  const coverFileName =
    book.coverFileName ??
    (await writeExtractedEpubCover(
      new Directory(libraryDirectory, book.id),
      bytes,
    ));
  return {
    ...book,
    coverFileName,
    epubLocations:
      analysis.format === "epub" ? analysis.epubLocations : book.epubLocations,
    sections:
      refreshStructure && analysis.format === "epub"
        ? analysis.sections
        : book.sections,
  };
}

function ensureLibraryDirectory() {
  libraryDirectory.create({ idempotent: true, intermediates: true });
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
