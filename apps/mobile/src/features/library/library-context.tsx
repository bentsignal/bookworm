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
  buildEpubEdition,
  buildEpubFromPdf,
  buildPdfEdition,
} from "@worm/ebook-core";

import type { PendingBookImport } from "./import-book-files";
import type { BookScope } from "~/db/catalog";
import {
  hydrateBooks,
  importQueries,
  libraryQueries,
  promoteStoredBooks,
  removeStoredBook,
  updateStoredBook,
} from "~/db/catalog";
import { extractPdfTextAsync } from "~/native/worm-pdf";
import { stagePickedBooks } from "./import-book-files";
import {
  convertedEpubDestination,
  copyImportToLibrary,
  coverDestination,
  deleteStoredBookFiles,
  editionDestination,
  getCoverFile,
  getSourceFile,
} from "./library-storage";

const listeners = new Set<() => void>();
const libraryQuerySet = libraryQueries();
const importQuerySet = importQueries();
const noPendingImports = new Array<PendingBookImport>();
let activityState = {
  isAddingToLibrary: false,
  pendingImports: noPendingImports,
};

export type BookImportDraft = BookRecord;

export function useLibrary() {
  const activity = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const libraryBookRows = useLiveQuery(libraryQuerySet.books).data;
  const librarySectionRows = useLiveQuery(libraryQuerySet.sections).data;
  const importBookRows = useLiveQuery(importQuerySet.books).data;
  const importSectionRows = useLiveQuery(importQuerySet.sections).data;
  const books = useMemo(
    () => hydrateBooks(libraryBookRows, librarySectionRows),
    [libraryBookRows, librarySectionRows],
  );
  const imports = useMemo(
    () => hydrateBooks(importBookRows, importSectionRows),
    [importBookRows, importSectionRows],
  );
  return {
    ...activity,
    books,
    imports,
    isImporting: activity.pendingImports.length > 0,
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
  const pending = picked.result.map((source) => ({
    fileName: source.name,
    id: Crypto.randomUUID(),
  }));
  setActivity({
    pendingImports: [...activityState.pendingImports, ...pending],
  });
  await nextPaint();
  void processPickedBooks(picked.result, pending);
  return pending.length > 0;
}

async function processPickedBooks(
  sources: File[],
  pending: PendingBookImport[],
) {
  const results = await stagePickedBooks(sources, pending, (id) =>
    setActivity({
      pendingImports: activityState.pendingImports.filter(
        (pendingImport) => pendingImport.id !== id,
      ),
    }),
  );
  const failures = results.filter((result) => result !== undefined);
  if (failures.length === 0) return;
  Alert.alert(
    failures.length === 1
      ? `Couldn’t read ${failures[0]?.fileName ?? "that book"}`
      : `Couldn’t read ${failures.length} books`,
    failures.map(({ message }) => message).join("\n"),
  );
}

async function addBooksToLibrary(imports: BookRecord[]) {
  if (imports.length === 0) return false;
  setActivity({ isAddingToLibrary: true });
  const now = new Date().toISOString();
  const promoted = imports.map((draft) => ({
    ...draft,
    importedAt: now,
    modifiedAt: now,
  }));
  let succeeded = false;
  try {
    await Promise.all(promoted.map((book) => copyImportToLibrary(book)));
    await promoteStoredBooks(promoted);
    for (const draft of imports) deleteStoredBookFiles(draft, "import");
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    succeeded = true;
  } catch (error) {
    for (const book of promoted) deleteStoredBookFiles(book, "library");
    Alert.alert("Couldn’t add those books", errorMessage(error));
  }
  setActivity({ isAddingToLibrary: false });
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

function nextPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The file could not be read.";
}
