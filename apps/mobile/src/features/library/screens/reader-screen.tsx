import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { File } from "expo-file-system";
import { Stack } from "expo-router";

import type { BookRecord } from "@worm/ebook-core";
import { buildEpubSectionHtml } from "@worm/ebook-core";

import { useColor } from "~/hooks/use-color";
import { getPdfPageCountAsync, WormPdfView } from "~/native/worm-pdf";
import { useLibrary } from "../library-context";
import { getSourceFile } from "../library-storage";

export function ReaderScreen({ id }: { id: string }) {
  const { books } = useLibrary();
  const book = books.find((item) => item.id === id);
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
      <BookReader book={book} />
    </View>
  );
}

function BookReader({ book }: { book: BookRecord }) {
  if (book.format === "pdf") {
    return <PdfReader book={book} />;
  }
  return <EpubReader book={book} />;
}

function PdfReader({ book }: { book: BookRecord }) {
  const insets = useSafeAreaInsets();
  const primary = useColor("primary");
  const sourceUri = getSourceFile(book).uri;
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();
  const [pageNumber, setPageNumber] = useState(1);

  // eslint-disable-next-line no-restricted-syntax -- PDFKit is an external native reader that must validate a new source URL before its view mounts.
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
        onPageChange={({ nativeEvent }) =>
          setPageNumber(nativeEvent.pageNumber)
        }
        sourceUri={sourceUri}
        style={{ flex: 1 }}
      />
      <ReaderPosition
        bottom={insets.bottom + 8}
        label={`Page ${pageNumber} of ${book.pageCount ?? 1}`}
      />
    </View>
  );
}

function EpubReader({ book }: { book: BookRecord }) {
  const insets = useSafeAreaInsets();
  const background = useColor("background");
  const foreground = useColor("foreground");
  const muted = useColor("border");
  const primary = useColor("primary");
  const sourceUri = getSourceFile(book).uri;
  const [document, setDocument] = useState({ key: "", html: "" });
  const [error, setError] = useState<string>();
  const [sectionIndex, setSectionIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const sections = book.sections.filter((section) => section.included);
  const section = sections[sectionIndex];
  const documentKey = `${section?.id ?? "none"}:${background}`;

  // eslint-disable-next-line no-restricted-syntax -- EPUB bytes are loaded from the external document store when this reader mounts or its source changes.
  useEffect(() => {
    let cancelled = false;
    if (!section) return;
    void new File(sourceUri)
      .bytes()
      .then((bytes) =>
        buildEpubSectionHtml(bytes, section, book.epubLocations ?? [], {
          background,
          foreground,
          muted,
        }),
      )
      .then((contents) => {
        if (!cancelled) setDocument({ key: documentKey, html: contents });
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(errorMessage(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [
    background,
    book.epubLocations,
    documentKey,
    foreground,
    muted,
    section,
    sourceUri,
  ]);

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
        javaScriptEnabled={false}
        onScroll={({ nativeEvent }) => {
          const maximum =
            nativeEvent.contentSize.height -
            nativeEvent.layoutMeasurement.height;
          setProgress(
            maximum <= 0
              ? 100
              : Math.round((nativeEvent.contentOffset.y / maximum) * 100),
          );
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
      <EpubReaderBar
        bottom={insets.bottom + 8}
        count={sections.length}
        index={sectionIndex}
        onChange={(index) => {
          setProgress(0);
          setSectionIndex(index);
        }}
        progress={progress}
        title={section.title}
      />
    </View>
  );
}

function EpubReaderBar({
  bottom,
  count,
  index,
  onChange,
  progress,
  title,
}: {
  bottom: number;
  count: number;
  index: number;
  onChange: (index: number) => void;
  progress: number;
  title: string;
}) {
  return (
    <View
      className="border-border bg-card absolute right-4 left-4 flex-row items-center rounded-2xl border px-2 py-2 shadow-sm"
      style={{ bottom }}
    >
      <ReaderNavigationButton
        disabled={index === 0}
        label="Previous chapter"
        onPress={() => onChange(index - 1)}
        symbol="‹"
      />
      <View className="min-w-0 flex-1 items-center px-2">
        <Text
          className="text-foreground text-xs font-semibold"
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text className="text-muted-foreground mt-0.5 text-[10px]">
          Chapter {index + 1} of {count} · {clamp(progress)}%
        </Text>
      </View>
      <ReaderNavigationButton
        disabled={index === count - 1}
        label="Next chapter"
        onPress={() => onChange(index + 1)}
        symbol="›"
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
  symbol: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className="h-10 w-10 items-center justify-center"
      disabled={disabled}
      onPress={onPress}
      style={{ opacity: disabled ? 0.25 : 1 }}
    >
      <Text className="text-primary text-3xl leading-8">{symbol}</Text>
    </Pressable>
  );
}

function ReaderPosition({ bottom, label }: { bottom: number; label: string }) {
  return (
    <View
      className="bg-card/95 border-border absolute self-center rounded-full border px-4 py-2"
      style={{ bottom }}
    >
      <Text className="text-foreground text-xs font-semibold">{label}</Text>
    </View>
  );
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
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
