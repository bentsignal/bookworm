import { File } from "expo-file-system";

import type { BookRecord, EpubReaderSession } from "@worm/ebook-core";
import { createEpubReaderSession } from "@worm/ebook-core";

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

const epubSessionCache = new Map<string, Promise<EpubReaderSession>>();
const epubDocumentCache = new Map<string, Promise<string>>();
const epubResolvedDocumentCache = new Map<string, string>();
