// eslint-disable-next-line no-restricted-imports -- Stable hydrated rows keep reader effects from restarting on unrelated SQLite notifications.
import { useMemo, useSyncExternalStore } from "react";
import { Alert } from "react-native";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

import type { BookRecord } from "@worm/ebook-core";
import {
  analyzeBook,
  buildEpubEdition,
  buildEpubFromPdf,
  buildPdfEdition,
  EPUB_STRUCTURE_VERSION,
} from "@worm/ebook-core";

import type { BookScope } from "~/db/catalog";
import {
  hydrateBooks,
  importQueries,
  insertBook,
  libraryQueries,
  removeStoredBook,
  updateStoredBook,
} from "~/db/catalog";
import { extractPdfTextAsync, renderPdfPageAsync } from "~/native/worm-pdf";
import {
  convertedEpubDestination,
  copyImportToLibrary,
  coverDestination,
  deleteStoredBookFiles,
  editionDestination,
  getCoverFile,
  getSourceFile,
  importBook,
  refreshEpubMetadata,
} from "./library-storage";

const listeners = new Set<() => void>();
const libraryQuerySet = libraryQueries();
const importQuerySet = importQueries();
let activityState = { isImporting: false };

export type BookImportDraft = BookRecord;

export function useLibrary() {
  const activity = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const libraryBookRows = useLiveQuery(libraryQuerySet.books).data;
  const librarySectionRows = useLiveQuery(libraryQuerySet.sections).data;
  const libraryLocationRows = useLiveQuery(libraryQuerySet.locations).data;
  const importBookRows = useLiveQuery(importQuerySet.books).data;
  const importSectionRows = useLiveQuery(importQuerySet.sections).data;
  const importLocationRows = useLiveQuery(importQuerySet.locations).data;
  const books = useMemo(
    () =>
      hydrateBooks(libraryBookRows, librarySectionRows, libraryLocationRows),
    [libraryBookRows, libraryLocationRows, librarySectionRows],
  );
  const imports = useMemo(
    () => hydrateBooks(importBookRows, importSectionRows, importLocationRows),
    [importBookRows, importLocationRows, importSectionRows],
  );
  return {
    ...activity,
    books,
    imports,
    isReady: true,
    addBooksToLibrary: () => addBooksToLibrary(imports),
    convertPdfToEpub: (id: string) => convertPdfToEpub(id, books),
    deleteBook: (id: string) => {
      void deleteScopedBook(id, "library", books);
    },
    deleteImport: (id: string) => {
      void deleteScopedBook(id, "import", imports);
    },
    exportBook: (id: string) => exportBook(id, books),
    pickBookDrafts,
    replaceBookCover: (id: string, scope: BookScope = "library") =>
      replaceBookCover(id, scope, scope === "library" ? books : imports),
    updateBook: (id: string, update: Partial<BookRecord>) =>
      updateScopedBook(id, update, "library", books),
    updateImport: (id: string, update: Partial<BookRecord>) =>
      updateScopedBook(id, update, "import", imports),
  };
}

async function convertPdfToEpub(id: string, books: BookRecord[]) {
  const book = books.find((item) => item.id === id);
  if (book?.format !== "pdf") return;
  try {
    const pageTexts = await extractPdfTextAsync(getSourceFile(book).uri);
    const bytes = await buildEpubFromPdf(
      pageTexts,
      {
        author: book.author,
        identifier: book.id,
        modifiedAt: book.modifiedAt,
        sections: book.sections,
        title: book.title,
      },
      await readBookCover(book, "library"),
    );
    const destination = convertedEpubDestination(book);
    if (destination.exists) destination.delete();
    destination.create();
    destination.write(bytes);
    updateScopedBook(
      id,
      { convertedEpubUri: destination.uri },
      "library",
      books,
    );
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(destination.uri, {
        mimeType: "application/epub+zip",
        UTI: "org.idpf.epub-container",
      });
    }
  } catch (error) {
    Alert.alert("Couldn’t create an EPUB", errorMessage(error));
  }
}

async function pickBookDrafts() {
  const picked = await File.pickFileAsync({
    mimeTypes: ["application/epub+zip", "application/pdf"],
    multipleFiles: true,
  });
  if (picked.canceled) return false;
  setActivity({ isImporting: true });
  const staged = new Array<BookRecord>();
  let succeeded = false;
  try {
    for (const source of picked.result) {
      const id = Crypto.randomUUID();
      const analysis = await analyzeBook(await source.bytes(), source.name);
      const stored = await importBook(source, id, analysis, "import");
      staged.push(stored);
      const prepared = await prepareBookAssets(stored, "import");
      await insertBook(prepared, "import");
      staged[staged.length - 1] = prepared;
    }
    succeeded = staged.length > 0;
  } catch (error) {
    for (const book of staged) {
      await removeStoredBook(book.id, "import").catch(() => undefined);
      deleteStoredBookFiles(book, "import");
    }
    Alert.alert("Couldn’t read those books", errorMessage(error));
  }
  setActivity({ isImporting: false });
  return succeeded;
}

async function addBooksToLibrary(imports: BookRecord[]) {
  if (imports.length === 0) return false;
  setActivity({ isImporting: true });
  const promoted = new Array<BookRecord>();
  let succeeded = false;
  try {
    for (const draft of imports) {
      const now = new Date().toISOString();
      const book = { ...draft, importedAt: now, modifiedAt: now };
      await copyImportToLibrary(book);
      try {
        await insertBook(book, "library");
      } catch (error) {
        deleteStoredBookFiles(book, "library");
        throw error;
      }
      await removeStoredBook(draft.id, "import");
      deleteStoredBookFiles(draft, "import");
      promoted.push(book);
    }
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    succeeded = true;
  } catch (error) {
    Alert.alert("Couldn’t add those books", errorMessage(error));
  }
  setActivity({ isImporting: false });
  return succeeded;
}

async function replaceBookCover(
  id: string,
  scope: BookScope,
  books: BookRecord[],
) {
  const book = books.find((item) => item.id === id);
  if (!book) return;
  const picked = await File.pickFileAsync({
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    multipleFiles: false,
  });
  if (picked.canceled) return;
  try {
    const source = picked.result;
    const extension = source.name.split(".").pop() ?? "jpg";
    const destination = coverDestination(book, extension, scope);
    if (destination.exists) destination.delete();
    await source.copy(destination, { overwrite: true });
    updateScopedBook(id, { coverFileName: destination.name }, scope, books);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    Alert.alert("Couldn’t change the cover", errorMessage(error));
  }
}

async function prepareBookAssets(book: BookRecord, scope: BookScope) {
  let prepared = book;
  if (
    book.format === "epub" &&
    (book.epubStructureVersion !== EPUB_STRUCTURE_VERSION ||
      !book.coverFileName)
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

function updateScopedBook(
  id: string,
  update: Partial<BookRecord>,
  scope: BookScope,
  books: BookRecord[],
) {
  const book = books.find((item) => item.id === id);
  if (!book) return;
  void updateStoredBook(book, update, scope).catch((error: unknown) => {
    Alert.alert("Couldn’t save those changes", errorMessage(error));
  });
}

async function deleteScopedBook(
  id: string,
  scope: BookScope,
  books: BookRecord[],
) {
  const book = books.find((item) => item.id === id);
  if (!book) return;
  try {
    await removeStoredBook(id, scope);
    deleteStoredBookFiles(book, scope);
  } catch (error) {
    Alert.alert("Couldn’t remove that book", errorMessage(error));
  }
}

async function exportBook(id: string, books: BookRecord[]) {
  const book = books.find((item) => item.id === id);
  if (!book) return;
  try {
    const shareUri = await writeEdition(book, getSourceFile(book));
    updateScopedBook(id, { exportedUri: shareUri }, "library", books);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(shareUri);
  } catch (error) {
    Alert.alert("Couldn’t export that book", errorMessage(error));
  }
}

async function writeEdition(book: BookRecord, source: File) {
  const sourceBytes = await source.bytes();
  const bytes =
    book.format === "pdf"
      ? await buildPdfEdition(sourceBytes, book.sections)
      : await buildEpubEdition(
          sourceBytes,
          book,
          await readBookCover(book, "library"),
        );
  const destination = editionDestination(book);
  if (destination.exists) destination.delete();
  destination.create();
  destination.write(bytes);
  return destination.uri;
}

async function readBookCover(book: BookRecord, scope: BookScope) {
  const cover = getCoverFile(book, scope);
  if (!cover?.exists) return undefined;
  return {
    bytes: await cover.bytes(),
    extension: cover.name.split(".").pop() ?? "jpg",
  };
}

function setActivity(update: Partial<typeof activityState>) {
  activityState = { ...activityState, ...update };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return activityState;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The file could not be read.";
}
