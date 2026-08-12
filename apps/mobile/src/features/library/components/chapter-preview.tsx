import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { File } from "expo-file-system";

import type { BookRecord, EpubLocation } from "@worm/ebook-core";
import { buildEpubBoundaryHtml } from "@worm/ebook-core";

import { useColor } from "~/hooks/use-color";
import { WormPdfView } from "~/native/worm-pdf";
import { getSourceFile } from "../library-storage";

export function ChapterPreview({
  book,
  onSelect,
  selected,
}: {
  book: BookRecord;
  onSelect: (value: number) => void;
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
  return (
    <EpubLocationPreview book={book} onSelect={onSelect} selected={selected} />
  );
}

function EpubLocationPreview({
  book,
  onSelect,
  selected,
}: {
  book: BookRecord;
  onSelect: (value: number) => void;
  selected: number;
}) {
  const background = useColor("background");
  const foreground = useColor("foreground");
  const muted = useColor("border");
  const primary = useColor("primary");
  const [document, setDocument] = useState({ key: "", html: "" });
  const locations = book.epubLocations ?? emptyLocations;
  const location = locations[selected - 1];
  const key = `${book.id}:${selected}:${background}`;

  // eslint-disable-next-line no-restricted-syntax -- The preview converts selected EPUB text boundaries into isolated reader HTML.
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    void new File(getSourceFile(book).uri)
      .bytes()
      .then((bytes) =>
        buildEpubBoundaryHtml(bytes, locations, selected - 1, {
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
  }, [background, book, foreground, key, location, locations, muted, selected]);

  if (document.key !== key) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text style={{ color: primary }}>Loading text…</Text>
      </View>
    );
  }
  return (
    <WebView
      allowFileAccess={false}
      containerStyle={{ backgroundColor: background }}
      decelerationRate="normal"
      injectedJavaScript={boundaryTapScript}
      javaScriptEnabled
      onMessage={({ nativeEvent }) => {
        const value = Number.parseInt(nativeEvent.data, 10);
        if (Number.isFinite(value)) onSelect(value);
      }}
      originWhitelist={["about:blank"]}
      source={{ html: document.html }}
      style={{ backgroundColor: background }}
    />
  );
}

const boundaryTapScript = `
var selectedBoundary = document.querySelector('.bookworm-boundary.selected');
if (selectedBoundary) selectedBoundary.scrollIntoView({ block: 'center' });
document.addEventListener('click', function (event) {
  var boundary = event.target.closest('[data-location]');
  if (boundary) window.ReactNativeWebView.postMessage(boundary.dataset.location);
});
true;
`;

const emptyLocations = new Array<EpubLocation>();
