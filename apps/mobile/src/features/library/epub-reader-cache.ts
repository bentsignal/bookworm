import { InteractionManager } from "react-native";
import { File } from "expo-file-system";

import type { BookRecord, EpubReaderSession } from "@lib/ebook-core";
import { createEpubReaderSession } from "@lib/ebook-core";

import type { BookScope } from "~/db/catalog";
import { getReadingProgress } from "~/db/catalog";
import { getSourceFile } from "./library-storage";
import { resolveEpubPosition } from "./reader-progress";

export interface ReaderTheme {
  background: string;
  foreground: string;
  muted: string;
}

interface ReaderDocumentInput {
  book: BookRecord;
  scope: BookScope;
  section: BookRecord["sections"][number];
  sourceUri: string;
  theme: ReaderTheme;
  themeKey: string;
}

export async function getReaderDocument({
  book,
  scope,
  section,
  sourceUri,
  theme,
  themeKey,
}: ReaderDocumentInput) {
  const documentKey = readerDocumentKey(book, scope, section.id, themeKey);
  const resolved = getResolvedReaderDocument(documentKey);
  if (resolved) return resolved;
  const cached = epubDocumentCache.get(documentKey);
  if (cached) return cached;
  const promise = getReaderSession(book, scope, sourceUri)
    .then((session) =>
      session.buildSectionHtml(section, book.epubLocations ?? [], theme),
    )
    .then((html) => {
      setBounded(epubResolvedDocumentCache, documentKey, html, 12);
      return html;
    })
    .catch((error: unknown) => {
      epubDocumentCache.delete(documentKey);
      throw error;
    });
  setBounded(epubDocumentCache, documentKey, promise, 12);
  return promise;
}

export function getResolvedReaderDocument(documentKey: string) {
  return epubResolvedDocumentCache.get(documentKey);
}

export function preloadEpubReadingPosition(
  book: BookRecord,
  theme: ReaderTheme,
) {
  if (book.format !== "epub") return Promise.resolve();
  const sections = book.sections.filter((section) => section.included);
  const position = resolveEpubPosition(sections, getReadingProgress(book.id));
  const section = sections[position.sectionIndex];
  if (!section) return Promise.resolve();
  const sourceUri = getSourceFile(book, "library").uri;
  const themeKey = readerThemeKey(theme);
  return getReaderDocument({
    book,
    scope: "library",
    section,
    sourceUri,
    theme,
    themeKey,
  }).then(() => undefined);
}

export function scheduleVisibleEpubPreloads(
  books: BookRecord[],
  theme: ReaderTheme,
) {
  queuedPreloads.clear();
  for (const book of books) {
    if (book.format !== "epub") continue;
    const key = `${book.id}:${book.modifiedAt}:${readerThemeKey(theme)}`;
    queuedPreloads.set(key, { book, theme });
  }
  scheduleNextPreload();
}

export function cancelScheduledEpubPreloads() {
  queuedPreloads.clear();
  if (preloadDelay) clearTimeout(preloadDelay);
  preloadDelay = undefined;
  scheduledPreload?.cancel();
  scheduledPreload = undefined;
}

export function readerDocumentKey(
  book: BookRecord,
  scope: BookScope,
  sectionId: string | undefined,
  themeKey: string,
) {
  return `${scope}:${book.id}:${book.modifiedAt}:${sectionId ?? "none"}:${themeKey}`;
}

export function readerThemeKey(theme: ReaderTheme) {
  return `${theme.background}:${theme.foreground}:${theme.muted}`;
}

function getReaderSession(
  book: BookRecord,
  scope: BookScope,
  sourceUri: string,
) {
  const key = `${scope}:${book.id}:${book.modifiedAt}:${book.sourceFileName}`;
  const cached = epubSessionCache.get(key);
  if (cached) return cached;
  const session = new File(sourceUri)
    .bytes()
    .then((bytes) => createEpubReaderSession(bytes))
    .catch((error: unknown) => {
      epubSessionCache.delete(key);
      throw error;
    });
  setBounded(epubSessionCache, key, session, 6);
  return session;
}

function setBounded<T>(
  cache: Map<string, T>,
  key: string,
  value: T,
  maximum: number,
) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > maximum) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}

function scheduleNextPreload() {
  if (preloadRunning || preloadDelay || scheduledPreload) return;
  if (queuedPreloads.size === 0) return;
  preloadDelay = setTimeout(() => {
    preloadDelay = undefined;
    scheduledPreload = InteractionManager.runAfterInteractions(() => {
      scheduledPreload = undefined;
      void runNextPreload();
    });
  }, 200);
}

async function runNextPreload() {
  const queued = queuedPreloads.entries().next().value;
  if (!queued) return;
  const [key, preload] = queued;
  queuedPreloads.delete(key);
  preloadRunning = true;
  try {
    await preloadEpubReadingPosition(preload.book, preload.theme);
  } catch {
    // Reader loading owns user-visible errors; speculative work fails silently.
  }
  preloadRunning = false;
  scheduleNextPreload();
}

interface QueuedPreload {
  book: BookRecord;
  theme: ReaderTheme;
}

const epubSessionCache = new Map<string, Promise<EpubReaderSession>>();
const epubDocumentCache = new Map<string, Promise<string>>();
const epubResolvedDocumentCache = new Map<string, string>();
const queuedPreloads = new Map<string, QueuedPreload>();
let preloadDelay: ReturnType<typeof setTimeout> | undefined;
let preloadRunning = false;
let scheduledPreload: { cancel: () => void } | undefined;
