import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";

import type { BookRecord } from "@worm/ebook-core";
import { normalizeEpubWhitespace } from "@worm/ebook-core";

import type { BookSearchDocument } from "../book-search";
import type { BookScope } from "~/db/catalog";
import { useColor } from "~/hooks/use-color";
import { extractPdfTextAsync } from "~/native/worm-pdf";
import { findBookTextMatches, nextMatchIndex } from "../book-search";
import { getSourceFile } from "../library-storage";

export function BookSearchControls({
  book,
  onFocus,
  onNavigate,
  selected,
  scope = "library",
}: {
  book: BookRecord;
  onFocus: () => void;
  onNavigate: (position: number) => void;
  selected: number;
  scope?: BookScope;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const input = useRef<TextInput>(null);
  const { documents, error, loading } = useSearchDocuments(book, scope);
  const deferredQuery = useDeferredValue(query);
  const matches = findBookTextMatches(documents, deferredQuery);

  function changeQuery(value: string) {
    setQuery(value);
    setActiveIndex(-1);
  }

  function navigate(direction: -1 | 1) {
    const next = nextMatchIndex(matches, activeIndex, selected, direction);
    if (next < 0) return;
    setActiveIndex(next);
    const match = matches[next];
    if (match) onNavigate(match.position);
  }

  const summary = searchSummary({
    activeIndex,
    error,
    format: book.format,
    loading,
    matches,
    query,
  });

  return (
    <View className="gap-2">
      <View className="border-border bg-background h-11 flex-row items-center rounded-xl border px-3">
        <SearchSymbol name="magnifyingglass" />
        <TextInput
          accessibilityLabel="Search book text"
          autoCapitalize="none"
          autoCorrect={false}
          className="text-foreground ml-2 min-w-0 flex-1 text-[16px]"
          enterKeyHint="search"
          onChangeText={changeQuery}
          onFocus={onFocus}
          onSubmitEditing={() => navigate(1)}
          placeholder="Search book text"
          ref={input}
          returnKeyType="search"
        />
        <SearchLoadingIndicator loading={loading} query={query} />
        <ClearSearchButton
          onPress={() => {
            input.current?.clear();
            changeQuery("");
          }}
          query={query}
        />
      </View>
      <SearchResultNavigation
        disabled={loading || matches.length === 0}
        onNext={() => navigate(1)}
        onPrevious={() => navigate(-1)}
        query={query}
        summary={summary}
      />
    </View>
  );
}

function useSearchDocuments(book: BookRecord, scope: BookScope) {
  const epubDocuments = epubSearchDocuments(book);
  const [pdfDocuments, setPdfDocuments] = useState<BookSearchDocument[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(book.format === "pdf");

  // eslint-disable-next-line no-restricted-syntax -- PDFKit text extraction is an asynchronous native system that is synchronized with the active book.
  useEffect(() => {
    if (book.format !== "pdf") return;
    let active = true;
    void pdfDocumentsFor(book, scope)
      .then((documents) => {
        if (active) setPdfDocuments(documents);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [book, scope]);

  return {
    documents: book.format === "pdf" ? pdfDocuments : epubDocuments,
    error,
    loading,
  };
}

function epubSearchDocuments(book: BookRecord) {
  if (book.format !== "epub") return new Array<BookSearchDocument>();
  return (book.epubLocations ?? []).map((location, index) => ({
    position: index + 1,
    text:
      normalizeEpubWhitespace(location.excerpt) ||
      normalizeEpubWhitespace(location.title),
  }));
}

function SearchLoadingIndicator({
  loading,
  query,
}: {
  loading: boolean;
  query: string;
}) {
  if (!loading || !query) return null;
  return <ActivityIndicator size="small" />;
}

function ClearSearchButton({
  onPress,
  query,
}: {
  onPress: () => void;
  query: string;
}) {
  if (!query) return null;
  return (
    <Pressable
      accessibilityLabel="Clear book search"
      accessibilityRole="button"
      className="ml-2 h-8 w-8 items-center justify-center"
      onPress={onPress}
    >
      <SearchSymbol name="xmark.circle.fill" />
    </Pressable>
  );
}

function SearchResultNavigation({
  disabled,
  onNext,
  onPrevious,
  query,
  summary,
}: {
  disabled: boolean;
  onNext: () => void;
  onPrevious: () => void;
  query: string;
  summary: string;
}) {
  if (!query) return null;
  return (
    <View className="flex-row items-center justify-between pl-1">
      <Text
        className="text-muted-foreground min-w-0 flex-1 text-xs"
        numberOfLines={1}
      >
        {summary}
      </Text>
      <View className="ml-3 flex-row gap-1">
        <ResultButton
          disabled={disabled}
          label="Previous search result"
          name="chevron.up"
          onPress={onPrevious}
        />
        <ResultButton
          disabled={disabled}
          label="Next search result"
          name="chevron.down"
          onPress={onNext}
        />
      </View>
    </View>
  );
}

function ResultButton({
  disabled,
  label,
  name,
  onPress,
}: {
  disabled: boolean;
  label: string;
  name: "chevron.down" | "chevron.up";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className="border-border bg-background h-9 w-10 items-center justify-center rounded-lg border"
      disabled={disabled}
      onPress={onPress}
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <SearchSymbol name={name} />
    </Pressable>
  );
}

function SearchSymbol({
  name,
}: {
  name: "chevron.down" | "chevron.up" | "magnifyingglass" | "xmark.circle.fill";
}) {
  const color = useColor("muted-foreground");
  return (
    <SymbolView
      fallback={<Text className="text-muted-foreground">•</Text>}
      name={name}
      size={17}
      tintColor={color}
      weight="semibold"
    />
  );
}

function searchSummary({
  activeIndex,
  error,
  format,
  loading,
  matches,
  query,
}: {
  activeIndex: number;
  error: boolean;
  format: BookRecord["format"];
  loading: boolean;
  matches: { position: number }[];
  query: string;
}) {
  if (!query.trim()) return "";
  if (loading) return loadingSummary(format);
  if (error) return "Couldn’t search this book.";
  if (matches.length === 0) return "No matches";
  if (activeIndex < 0)
    return `${matches.length} ${matches.length === 1 ? "match" : "matches"}`;
  const position = matches[activeIndex]?.position ?? 1;
  const noun = format === "pdf" ? "page" : "text block";
  return `${activeIndex + 1} of ${matches.length} · ${noun} ${position}`;
}

function loadingSummary(format: BookRecord["format"]) {
  return format === "pdf" ? "Indexing PDF…" : "Searching…";
}

function pdfDocumentsFor(book: BookRecord, scope: BookScope) {
  const key = `${scope}:${book.id}`;
  const cached = pdfDocumentCache.get(key);
  if (cached) return cached;
  const documents = extractPdfTextAsync(getSourceFile(book, scope).uri).then(
    (pages) => pages.map((text, index) => ({ position: index + 1, text })),
  );
  pdfDocumentCache.set(key, documents);
  return documents;
}

const pdfDocumentCache = new Map<string, Promise<BookSearchDocument[]>>();
