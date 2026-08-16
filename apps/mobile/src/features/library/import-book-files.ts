import type { File } from "expo-file-system";

import type { BookRecord } from "@lib/ebook-core";
import { EPUB_STRUCTURE_VERSION, prepareBookImport } from "@lib/ebook-core";

import type { BookScope } from "~/db/catalog";
import { insertBook, removeStoredBook } from "~/db/catalog";
import { renderPdfPageAsync } from "~/native/lib-pdf";
import {
  coverDestination,
  deleteStoredBookFiles,
  getSourceFile,
  importBook,
  refreshEpubMetadata,
} from "./library-storage";

export interface PendingBookImport {
  fileName: string;
  id: string;
}

export async function stagePickedBooks(
  sources: File[],
  pending: PendingBookImport[],
  onSettled: (id: string, succeeded: boolean) => void,
) {
  return Promise.all(
    sources.map((source, index) =>
      stagePickedBook(source, pending[index], onSettled),
    ),
  );
}

async function stagePickedBook(
  source: File,
  pending: PendingBookImport | undefined,
  onSettled: (id: string, succeeded: boolean) => void,
) {
  if (!pending) return undefined;
  let stored: BookRecord | undefined;
  let failure: ImportFailure | undefined;
  try {
    const bytes = await source.bytes();
    const preparedImport = await prepareBookImport(bytes, source.name);
    stored = await importBook({
      analyzed: preparedImport.analysis,
      extractedCover: preparedImport.cover,
      id: pending.id,
      scope: "import",
      source,
      sourceBytes: bytes,
    });
    const prepared = await prepareBookAssets(stored, "import");
    await insertBook(prepared, "import");
  } catch (error) {
    if (stored) {
      await removeStoredBook(stored.id, "import").catch(() => undefined);
      deleteStoredBookFiles(stored, "import");
    }
    failure = { fileName: source.name, message: errorMessage(error) };
  }
  onSettled(pending.id, failure === undefined);
  return failure;
}

async function prepareBookAssets(book: BookRecord, scope: BookScope) {
  let prepared = book;
  if (
    book.format === "epub" &&
    book.epubStructureVersion !== EPUB_STRUCTURE_VERSION
  ) {
    prepared = await refreshEpubMetadata(book, scope);
  }
  if (prepared.format !== "pdf" || prepared.coverFileName) return prepared;
  try {
    const destination = coverDestination(prepared, "jpg", scope);
    if (destination.exists) destination.delete();
    await renderPdfPageAsync(
      getSourceFile(prepared, scope).uri,
      destination.uri,
      1,
    );
    return { ...prepared, coverFileName: destination.name };
  } catch {
    return prepared;
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The file could not be read.";
}

interface ImportFailure {
  fileName: string;
  message: string;
}
