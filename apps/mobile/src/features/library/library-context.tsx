import { useSyncExternalStore } from "react";
import { Alert } from "react-native";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";

import type { BookAnalysis, BookRecord } from "@worm/ebook-core";
import {
  analyzeBook,
  buildEpubEdition,
  buildEpubFromPdf,
  buildPdfEdition,
  EPUB_STRUCTURE_VERSION,
} from "@worm/ebook-core";

import { extractPdfTextAsync, renderPdfPageAsync } from "~/native/worm-pdf";
import {
  convertedEpubDestination,
  coverDestination,
  deleteBookFiles,
  editionDestination,
  getCoverFile,
  getSourceFile,
  importBook,
  loadLibrary,
  refreshEpubMetadata,
  saveLibrary,
} from "./library-storage";

const listeners = new Set<() => void>();
let state = {
  books: new Array<BookRecord>(),
  isImporting: false,
  isReady: false,
};

void initializeLibrary();

export function useLibrary() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snapshot,
    convertPdfToEpub,
    deleteBook,
    exportBook,
    addBooksToLibrary,
    pickBookDrafts,
    replaceBookCover,
    updateBook,
  };
}

export interface BookImportDraft extends BookAnalysis {
  id: string;
  source: File;
  sourceFileName: string;
}

async function convertPdfToEpub(id: string) {
  const book = state.books.find((item) => item.id === id);
  if (book?.format !== "pdf") return;
  try {
    const pageTexts = await extractPdfTextAsync(getSourceFile(book).uri);
    const bytes = await buildEpubFromPdf(
      pageTexts,
      {
        identifier: book.id,
        title: book.title,
        author: book.author,
        modifiedAt: book.modifiedAt,
        sections: book.sections,
      },
      await readBookCover(book),
    );
    const destination = convertedEpubDestination(book);
    if (destination.exists) destination.delete();
    destination.create();
    destination.write(bytes);
    updateBook(id, { convertedEpubUri: destination.uri });
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

async function initializeLibrary() {
  const stored = await loadLibrary();
  const books = await Promise.all(stored.map(prepareBookAssets));
  saveLibrary(books);
  setState({ books, isReady: true });
}

async function pickBookDrafts() {
  const picked = await File.pickFileAsync({
    mimeTypes: ["application/epub+zip", "application/pdf"],
    multipleFiles: true,
  });
  if (picked.canceled) return [];
  setState({ isImporting: true });
  let drafts = new Array<BookImportDraft>();
  try {
    drafts = await Promise.all(
      picked.result.map(async (source) => ({
        ...(await analyzeBook(await source.bytes(), source.name)),
        id: Crypto.randomUUID(),
        source,
        sourceFileName: source.name,
      })),
    );
  } catch (error) {
    Alert.alert("Couldn’t read those books", errorMessage(error));
  }
  setState({ isImporting: false });
  return drafts;
}

async function addBooksToLibrary(drafts: BookImportDraft[]) {
  if (drafts.length === 0) return false;
  setState({ isImporting: true });
  const imported = new Array<BookRecord>();
  let succeeded = false;
  try {
    for (const draft of drafts) {
      const author = draft.author?.trim();
      const title = draft.title.trim();
      const book = await importBook(draft.source, draft.id, {
        author: author === "" ? undefined : author,
        epubLocations: draft.epubLocations,
        epubStructureVersion: draft.epubStructureVersion,
        format: draft.format,
        pageCount: draft.pageCount,
        sections: draft.sections,
        title: title.length === 0 ? "Untitled book" : title,
      });
      imported.push(await prepareBookAssets(book));
    }
    updateBooks([...imported, ...state.books]);
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    succeeded = true;
  } catch (error) {
    for (const book of imported) deleteBookFiles(book);
    Alert.alert("Couldn’t add those books", errorMessage(error));
  }
  setState({ isImporting: false });
  return succeeded;
}

async function replaceBookCover(id: string) {
  const book = state.books.find((item) => item.id === id);
  if (!book) return;
  const picked = await File.pickFileAsync({
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    multipleFiles: false,
  });
  if (picked.canceled) return;
  try {
    const source = picked.result;
    const extension = source.name.split(".").pop() ?? "jpg";
    const destination = coverDestination(book, extension);
    if (destination.exists) destination.delete();
    await source.copy(destination, { overwrite: true });
    updateBook(id, { coverFileName: destination.name });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    Alert.alert("Couldn’t change the cover", errorMessage(error));
  }
}

async function prepareBookAssets(book: BookRecord) {
  let prepared = book;
  if (
    book.format === "epub" &&
    (needsEpubStructureRefresh(book) || !book.coverFileName)
  ) {
    prepared = await refreshEpubMetadata(book);
  }
  if (prepared.format !== "pdf" || prepared.coverFileName) return prepared;
  try {
    const destination = coverDestination(prepared, "jpg");
    if (destination.exists) destination.delete();
    await renderPdfPageAsync(getSourceFile(prepared).uri, destination.uri, 1);
    return { ...prepared, coverFileName: destination.name };
  } catch {
    return prepared;
  }
}

function needsEpubStructureRefresh(book: BookRecord) {
  return book.epubStructureVersion !== EPUB_STRUCTURE_VERSION;
}

function updateBook(id: string, update: Partial<BookRecord>) {
  updateBooks(
    state.books.map((book) =>
      book.id === id
        ? { ...book, ...update, modifiedAt: new Date().toISOString() }
        : book,
    ),
  );
}

function deleteBook(id: string) {
  const book = state.books.find((item) => item.id === id);
  if (book) deleteBookFiles(book);
  updateBooks(state.books.filter((item) => item.id !== id));
}

async function exportBook(id: string) {
  const book = state.books.find((item) => item.id === id);
  if (!book) return;
  try {
    const source = getSourceFile(book);
    const shareUri = await writeEdition(book, source);
    updateBook(id, { exportedUri: shareUri });
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
      : await buildEpubEdition(sourceBytes, book, await readBookCover(book));
  const destination = editionDestination(book);
  if (destination.exists) destination.delete();
  destination.create();
  destination.write(bytes);
  return destination.uri;
}

async function readBookCover(book: BookRecord) {
  const cover = getCoverFile(book);
  if (!cover?.exists) return undefined;
  return {
    bytes: await cover.bytes(),
    extension: cover.name.split(".").pop() ?? "jpg",
  };
}

function updateBooks(books: BookRecord[]) {
  saveLibrary(books);
  setState({ books });
}

function setState(update: Partial<typeof state>) {
  state = { ...state, ...update };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The file could not be read.";
}
