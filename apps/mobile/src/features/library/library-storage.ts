import { Directory, File, Paths } from "expo-file-system";

import type { BookAnalysis, BookRecord } from "@worm/ebook-core";
import {
  analyzeBook,
  createEditionFileName,
  EPUB_STRUCTURE_VERSION,
  extractEpubCover,
} from "@worm/ebook-core";

import type { BookScope } from "~/db/catalog";

const libraryDirectory = new Directory(Paths.document, "Library");
const importDirectory = new Directory(Paths.document, "Imports");

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
