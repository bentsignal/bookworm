import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { File } from "expo-file-system";

import type { BookRecord } from "@worm/ebook-core";
import { buildEpubLocationHtml } from "@worm/ebook-core";

import { useColor } from "~/hooks/use-color";
import { WormPdfView } from "~/native/worm-pdf";
import { getSourceFile } from "../library-storage";

export function ChapterPreview({
  book,
  selected,
}: {
  book: BookRecord;
  selected: number;
}) {
  if (book.format === "pdf") {
    return (
      <WormPdfView
        displayMode="singlePage"
        pageNumber={selected}
        sourceUri={getSourceFile(book).uri}
        style={{ flex: 1 }}
      />
    );
  }
  return <EpubLocationPreview book={book} selected={selected} />;
}

function EpubLocationPreview({
  book,
  selected,
}: {
  book: BookRecord;
  selected: number;
}) {
  const background = useColor("background");
  const foreground = useColor("foreground");
  const muted = useColor("border");
  const primary = useColor("primary");
  const [document, setDocument] = useState({ key: "", html: "" });
  const location = book.epubLocations?.[selected - 1];
  const key = `${book.id}:${selected}:${background}`;

  // eslint-disable-next-line no-restricted-syntax -- The preview converts a selected external EPUB location into isolated reader HTML.
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    void new File(getSourceFile(book).uri)
      .bytes()
      .then((bytes) =>
        buildEpubLocationHtml(bytes, location, {
          background,
          foreground,
          muted,
        }),
      )
      .then((html) => {
        if (!cancelled) setDocument({ key, html });
      });
    return () => {
      cancelled = true;
    };
  }, [background, book, foreground, key, location, muted]);

  if (document.key !== key) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text style={{ color: primary }}>Loading location…</Text>
      </View>
    );
  }
  return (
    <WebView
      allowFileAccess={false}
      containerStyle={{ backgroundColor: background }}
      decelerationRate="normal"
      javaScriptEnabled={false}
      originWhitelist={["about:blank"]}
      source={{ html: document.html }}
      style={{ backgroundColor: background }}
    />
  );
}
