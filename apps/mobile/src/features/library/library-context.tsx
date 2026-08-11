import { useSyncExternalStore } from "react";
import { Alert } from "react-native";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";

import type { BookRecord } from "@worm/ebook-core";
import { buildPdfEdition } from "@worm/ebook-core";

import {
  deleteBookFiles,
  editionDestination,
  getSourceFile,
  importBook,
  loadLibrary,
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
    deleteBook,
    exportBook,
    importBooks,
    updateBook,
  };
}

async function initializeLibrary() {
  const books = await loadLibrary();
  setState({ books, isReady: true });
}

async function importBooks() {
  const picked = await File.pickFileAsync({
    mimeTypes: ["application/epub+zip", "application/pdf"],
    multipleFiles: true,
  });
  if (picked.canceled) return;
  setState({ isImporting: true });
  try {
    const imported = await Promise.all(
      picked.result.map((file) => importBook(file, Crypto.randomUUID())),
    );
    updateBooks([...imported, ...state.books]);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    Alert.alert("Couldn’t import that book", errorMessage(error));
  }
  setState({ isImporting: false });
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
    let shareUri = source.uri;
    if (book.format === "pdf") {
      shareUri = await writePdfEdition(book, source);
      updateBook(id, { exportedUri: shareUri });
    }
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(shareUri);
  } catch (error) {
    Alert.alert("Couldn’t export that book", errorMessage(error));
  }
}

async function writePdfEdition(book: BookRecord, source: File) {
  const bytes = await buildPdfEdition(await source.bytes(), book.sections);
  const destination = editionDestination(book);
  if (destination.exists) destination.delete();
  destination.create();
  destination.write(bytes);
  return destination.uri;
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
