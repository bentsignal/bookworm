import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { File } from "expo-file-system";
import { Stack } from "expo-router";

import type { BookRecord } from "@worm/ebook-core";
import { buildEpubReaderHtml } from "@worm/ebook-core";

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
  const primary = useColor("primary");
  const sourceUri = getSourceFile(book).uri;
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();

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
  return <WormPdfView sourceUri={sourceUri} style={{ flex: 1 }} />;
}

function EpubReader({ book }: { book: BookRecord }) {
  const background = useColor("background");
  const foreground = useColor("foreground");
  const muted = useColor("border");
  const primary = useColor("primary");
  const sourceUri = getSourceFile(book).uri;
  const [html, setHtml] = useState<string>();
  const [error, setError] = useState<string>();

  // eslint-disable-next-line no-restricted-syntax -- EPUB bytes are loaded from the external document store when this reader mounts or its source changes.
  useEffect(() => {
    let cancelled = false;
    void new File(sourceUri)
      .bytes()
      .then((bytes) =>
        buildEpubReaderHtml(bytes, book.sections, {
          background,
          foreground,
          muted,
        }),
      )
      .then((contents) => {
        if (!cancelled) setHtml(contents);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(errorMessage(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [background, book.sections, foreground, muted, sourceUri]);

  if (error) return <ReaderError format="EPUB" message={error} />;
  if (!html) return <ReaderLoading color={primary} />;
  return (
    <WebView
      allowFileAccess={false}
      allowsLinkPreview={false}
      containerStyle={{ backgroundColor: background }}
      javaScriptEnabled={false}
      onShouldStartLoadWithRequest={({ url }) => url.startsWith("about:blank")}
      originWhitelist={["about:blank"]}
      setSupportMultipleWindows={false}
      source={{ html }}
      style={{ backgroundColor: background }}
      textInteractionEnabled
    />
  );
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
