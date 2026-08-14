// eslint-disable-next-line no-restricted-imports -- Included chapters must remain referentially stable while progress rows update reactively.
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { File } from "expo-file-system";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import type { BookRecord, EpubReaderSession } from "@worm/ebook-core";
import { createEpubReaderSession } from "@worm/ebook-core";

import type { BookScope, ReadingProgress } from "~/db/catalog";
import { getReadingProgress, saveReadingProgress } from "~/db/catalog";
import { useColor } from "~/hooks/use-color";
import { getPdfPageCountAsync, WormPdfView } from "~/native/worm-pdf";
import { ChapterControlsPanel } from "../components/chapter-controls-panel";
import { useLibrary } from "../library-context";
import { getSourceFile } from "../library-storage";
import { resolveEpubPosition } from "../reader-progress";

/* eslint-disable max-lines */

export function ReaderScreen({ id, scope }: { id: string; scope: BookScope }) {
  const { books, imports } = useLibrary();
  const book = (scope === "library" ? books : imports).find(
    (item) => item.id === id,
  );
  if (!book) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Text className="text-muted-foreground">Book not found.</Text>
      </View>
    );
  }
  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerLargeTitle: false, title: book.title }} />
      <BookReader book={book} scope={scope} />
    </View>
  );
}

function BookReader({ book, scope }: { book: BookRecord; scope: BookScope }) {
  const [progress] = useState(() =>
    scope === "library" ? getReadingProgress(book.id) : undefined,
  );
  if (book.format === "pdf") {
    return <PdfReader book={book} progress={progress} scope={scope} />;
  }
  return <EpubReader book={book} progress={progress} scope={scope} />;
}

function PdfReader({
  book,
  progress,
  scope,
}: {
  book: BookRecord;
  progress: ReadingProgress | undefined;
  scope: BookScope;
}) {
  const primary = useColor("primary");
  const sourceUri = getSourceFile(book, scope).uri;
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();
  const [pageNumber, setPageNumber] = useState(progress?.pdfPage ?? 1);
  const [initialPage] = useState(progress?.pdfPage ?? 1);
  const [controlsExpanded, setControlsExpanded] = useState(false);

  // eslint-disable-next-line no-restricted-syntax -- PDFKit readiness is an external native reader lifecycle.
  useEffect(() => {
    let cancelled = false;
    void getPdfPageCountAsync(sourceUri)
      .then(() => {
        if (!cancelled) setIsReady(true);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(errorMessage(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [sourceUri]);

  if (error) return <ReaderError format="PDF" message={error} />;
  if (!isReady) return <ReaderLoading color={primary} />;
  return (
    <View className="flex-1">
      <WormPdfView
        onPageChange={({ nativeEvent }) => {
          setPageNumber(nativeEvent.pageNumber);
          if (scope === "library") {
            void saveReadingProgress(book.id, {
              pdfPage: nativeEvent.pageNumber,
            });
          }
        }}
        pageNumber={initialPage}
        sourceUri={sourceUri}
        style={{ flex: 1 }}
      />
      <ReaderControls
        book={book}
        expanded={controlsExpanded}
        onExpandedChange={setControlsExpanded}
        scope={scope}
        detail={`Page ${pageNumber} of ${book.pageCount ?? 1}`}
      />
    </View>
  );
}

// eslint-disable-next-line max-lines-per-function -- Reader state intentionally stays together to coordinate WebView restoration, caching, navigation, and durable progress.
function EpubReader({
  book,
  progress: savedProgress,
  scope,
}: {
  book: BookRecord;
  progress: ReadingProgress | undefined;
  scope: BookScope;
}) {
  const background = useColor("background");
  const foreground = useColor("foreground");
  const muted = useColor("border");
  const primary = useColor("primary");
  const sourceUri = getSourceFile(book, scope).uri;
  const sections = useMemo(
    () => book.sections.filter((section) => section.included),
    [book.sections],
  );
  const initialPosition = resolveEpubPosition(sections, savedProgress);
  const [sectionIndex, setSectionIndex] = useState(
    initialPosition.sectionIndex,
  );
  const [document, setDocument] = useState({ key: "", html: "" });
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState(
    Math.round(initialPosition.scrollProgress * 100),
  );
  const [restoreProgress, setRestoreProgress] = useState(
    initialPosition.scrollProgress,
  );
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const section = sections[sectionIndex];
  const sectionProgress = useRef(new Map<string, number>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const latestProgress = useRef({
    scrollProgress: initialPosition.scrollProgress,
    sectionId: section?.id,
    sectionIndex: initialPosition.sectionIndex,
  });
  const themeKey = `${background}:${foreground}:${muted}`;
  const documentKey = readerDocumentKey(book, scope, section?.id, themeKey);

  // eslint-disable-next-line no-restricted-syntax -- EPUB rendering synchronizes an external archive session with the active section.
  useEffect(() => {
    if (!section) return;
    let cancelled = false;
    void getReaderDocument({
      book,
      section,
      scope,
      sourceUri,
      theme: { background, foreground, muted },
      themeKey,
    })
      .then((html) => {
        if (!cancelled) setDocument({ key: documentKey, html });
      })
      .then(() =>
        preloadAdjacentSections({
          book,
          index: sectionIndex,
          scope,
          sections,
          sourceUri,
          theme: { background, foreground, muted },
          themeKey,
        }),
      )
      .catch((reason: unknown) => {
        if (!cancelled) setError(errorMessage(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [
    background,
    book,
    documentKey,
    foreground,
    muted,
    scope,
    section,
    sectionIndex,
    sections,
    sourceUri,
    themeKey,
  ]);

  // eslint-disable-next-line no-restricted-syntax -- Unmount cleanup flushes the last external reader position to SQLite.
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (scope === "library") {
        saveReadingProgress(book.id, latestProgress.current);
      }
    },
    [book.id, scope],
  );

  if (error) return <ReaderError format="EPUB" message={error} />;
  if (!section) {
    return <ReaderError format="EPUB" message="No chapters are included." />;
  }
  if (document.key !== documentKey) return <ReaderLoading color={primary} />;
  return (
    <View className="flex-1">
      <WebView
        allowFileAccess={false}
        allowsLinkPreview={false}
        bounces
        containerStyle={{ backgroundColor: background }}
        decelerationRate="normal"
        injectedJavaScript={restoreScrollScript(restoreProgress)}
        javaScriptEnabled
        onScroll={({ nativeEvent }) => {
          const maximum =
            nativeEvent.contentSize.height -
            nativeEvent.layoutMeasurement.height;
          const next =
            maximum <= 0
              ? 1
              : Math.max(0, Math.min(1, nativeEvent.contentOffset.y / maximum));
          sectionProgress.current.set(section.id, next);
          latestProgress.current = {
            scrollProgress: next,
            sectionId: section.id,
            sectionIndex,
          };
          setProgress(Math.round(next * 100));
          if (scope !== "library") return;
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            saveReadingProgress(book.id, {
              scrollProgress: next,
              sectionId: section.id,
              sectionIndex,
            });
          }, 350);
        }}
        onShouldStartLoadWithRequest={({ url }) =>
          url.startsWith("about:blank")
        }
        originWhitelist={["about:blank"]}
        scrollEventThrottle={100}
        setSupportMultipleWindows={false}
        source={{ html: document.html }}
        style={{ backgroundColor: background }}
        textInteractionEnabled
      />
      <ReaderControls
        book={book}
        expanded={controlsExpanded}
        header={
          <EpubNavigation
            count={sections.length}
            index={sectionIndex}
            onChange={(index) => {
              const nextSection = sections[index];
              const nextProgress = nextSection
                ? (sectionProgress.current.get(nextSection.id) ?? 0)
                : 0;
              setProgress(Math.round(nextProgress * 100));
              setRestoreProgress(nextProgress);
              if (nextSection) {
                const nextKey = readerDocumentKey(
                  book,
                  scope,
                  nextSection.id,
                  themeKey,
                );
                const cachedDocument = epubResolvedDocumentCache.get(nextKey);
                if (cachedDocument) {
                  setDocument({ key: nextKey, html: cachedDocument });
                }
              }
              setSectionIndex(index);
              latestProgress.current = {
                scrollProgress: nextProgress,
                sectionId: nextSection?.id,
                sectionIndex: index,
              };
              if (scope === "library" && nextSection) {
                saveReadingProgress(book.id, {
                  scrollProgress: nextProgress,
                  sectionId: nextSection.id,
                  sectionIndex: index,
                });
              }
            }}
            progress={progress}
            title={section.title}
            onToggle={() => setControlsExpanded(!controlsExpanded)}
          />
        }
        onExpandedChange={setControlsExpanded}
        scope={scope}
      />
    </View>
  );
}

function ReaderControls({
  book,
  detail,
  expanded,
  header,
  onExpandedChange,
  scope,
}: {
  book: BookRecord;
  detail?: string;
  expanded: boolean;
  header?: React.ReactNode;
  onExpandedChange: (expanded: boolean) => void;
  scope: BookScope;
}) {
  const router = useRouter();
  return (
    <ChapterControlsPanel
      expanded={expanded}
      header={header}
      onExpandedChange={onExpandedChange}
    >
      <ReaderBookDetails book={book} detail={detail} />
      <Pressable
        accessibilityRole="button"
        className="bg-primary h-11 items-center justify-center rounded-full active:opacity-75"
        onPress={() =>
          router.push({
            pathname: "/book/[id]",
            params: { id: book.id, scope },
          })
        }
      >
        <Text className="text-primary-foreground text-sm font-semibold">
          Edit book
        </Text>
      </Pressable>
    </ChapterControlsPanel>
  );
}

function ReaderBookDetails({
  book,
  detail,
}: {
  book: BookRecord;
  detail?: string;
}) {
  return (
    <View>
      <Text
        className="text-foreground text-[15px] font-semibold"
        numberOfLines={1}
      >
        {book.title}
      </Text>
      <ReaderDetail text={book.author} />
      <ReaderDetail text={detail} />
    </View>
  );
}

function ReaderDetail({ text }: { text: string | undefined }) {
  if (!text) return null;
  return (
    <Text className="text-muted-foreground mt-1 text-sm" numberOfLines={1}>
      {text}
    </Text>
  );
}

function EpubNavigation({
  count,
  index,
  onChange,
  onToggle,
  progress,
  title,
}: {
  count: number;
  index: number;
  onChange: (index: number) => void;
  onToggle: () => void;
  progress: number;
  title: string;
}) {
  return (
    <View className="w-full flex-row items-center px-2">
      <ReaderNavigationButton
        disabled={index === 0}
        label="Previous chapter"
        onPress={() => onChange(index - 1)}
        symbol="chevron.left"
      />
      <Pressable
        accessibilityHint="Expands reader controls"
        accessibilityRole="button"
        className="min-w-0 flex-1 items-center px-2 py-1"
        onPress={onToggle}
      >
        <Text
          className="text-foreground text-xs font-semibold"
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text className="text-muted-foreground mt-0.5 text-[10px]">
          Chapter {index + 1} of {count} · {progress}%
        </Text>
      </Pressable>
      <ReaderNavigationButton
        disabled={index === count - 1}
        label="Next chapter"
        onPress={() => onChange(index + 1)}
        symbol="chevron.right"
      />
    </View>
  );
}

function ReaderNavigationButton({
  disabled,
  label,
  onPress,
  symbol,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  symbol: "chevron.left" | "chevron.right";
}) {
  const primary = useColor("primary");
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className="active:bg-muted h-13 w-14 items-center justify-center rounded-full"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={{ opacity: disabled ? 0.25 : 1 }}
    >
      <SymbolView
        name={symbol}
        size={20}
        tintColor={primary}
        weight="semibold"
      />
    </Pressable>
  );
}

async function getReaderDocument({
  book,
  scope,
  section,
  sourceUri,
  theme,
  themeKey,
}: ReaderDocumentInput) {
  const documentKey = readerDocumentKey(book, scope, section.id, themeKey);
  const cached = epubDocumentCache.get(documentKey);
  if (cached) return cached;
  const promise = getReaderSession(book, scope, sourceUri)
    .then((session) =>
      session.buildSectionHtml(section, book.epubLocations ?? [], theme),
    )
    .then((html) => {
      epubResolvedDocumentCache.set(documentKey, html);
      return html;
    });
  epubDocumentCache.set(documentKey, promise);
  return promise;
}

async function preloadAdjacentSections({
  index,
  sections,
  ...input
}: ReaderPreloadInput) {
  const adjacent = [sections[index - 1], sections[index + 1]].filter(
    (section) => section !== undefined,
  );
  await Promise.allSettled(
    adjacent.map((section) => getReaderDocument({ ...input, section })),
  );
}

function getReaderSession(
  book: BookRecord,
  scope: BookScope,
  sourceUri: string,
) {
  const key = `${scope}:${book.id}:${book.sourceFileName}`;
  const cached = epubSessionCache.get(key);
  if (cached) return cached;
  const session = new File(sourceUri)
    .bytes()
    .then((bytes) => createEpubReaderSession(bytes));
  epubSessionCache.set(key, session);
  return session;
}

function readerDocumentKey(
  book: BookRecord,
  scope: BookScope,
  sectionId: string | undefined,
  themeKey: string,
) {
  return `${scope}:${book.id}:${book.modifiedAt}:${sectionId ?? "none"}:${themeKey}`;
}

function restoreScrollScript(progress: number) {
  return `(function () {
    function restore() {
    var maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, maximum * ${Math.max(0, Math.min(1, progress))});
    }
    restore();
    requestAnimationFrame(restore);
    setTimeout(restore, 50);
  })(); true;`;
}

function ReaderLoading({ color }: { color: string }) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color={color} />
    </View>
  );
}

function ReaderError({
  format,
  message,
}: {
  format: "EPUB" | "PDF";
  message: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-foreground text-center text-[16px] font-semibold">
        Couldn’t open this {format}
      </Text>
      <Text className="text-muted-foreground mt-2 text-center">{message}</Text>
    </View>
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The book could not be read.";
}

interface ReaderDocumentInput {
  book: BookRecord;
  scope: BookScope;
  section: BookRecord["sections"][number];
  sourceUri: string;
  theme: { background: string; foreground: string; muted: string };
  themeKey: string;
}

interface ReaderPreloadInput extends Omit<ReaderDocumentInput, "section"> {
  index: number;
  sections: BookRecord["sections"];
}

const epubSessionCache = new Map<string, Promise<EpubReaderSession>>();
const epubDocumentCache = new Map<string, Promise<string>>();
const epubResolvedDocumentCache = new Map<string, string>();
