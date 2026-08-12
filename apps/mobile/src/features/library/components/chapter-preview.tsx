import type { WebView as WebViewInstance } from "react-native-webview";
import { useEffect, useRef, useState } from "react";
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
  const preview = useRef<WebViewInstance>(null);
  const [initialSelected] = useState(selected);
  const [document, setDocument] = useState({ key: "", html: "" });
  const locations = book.epubLocations ?? emptyLocations;
  const sourceUri = getSourceFile(book).uri;
  const key = `${book.id}:${book.epubStructureVersion ?? 0}:${locations.length}:${background}:${foreground}:${muted}`;

  // eslint-disable-next-line no-restricted-syntax -- The preview converts the EPUB into one reusable boundary document per editor session.
  useEffect(() => {
    if (locations.length === 0) return;
    let cancelled = false;
    void new File(sourceUri)
      .bytes()
      .then((bytes) =>
        buildEpubBoundaryHtml(bytes, locations, initialSelected - 1, {
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
  }, [
    background,
    foreground,
    initialSelected,
    key,
    locations,
    muted,
    sourceUri,
  ]);

  // eslint-disable-next-line no-restricted-syntax -- Selection is moved inside the existing WebView so slider updates do not reload EPUB content.
  useEffect(() => {
    preview.current?.injectJavaScript(selectBoundaryScript(selected));
  }, [selected]);

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
      onLoadEnd={() =>
        preview.current?.injectJavaScript(selectBoundaryScript(selected))
      }
      originWhitelist={["about:blank"]}
      ref={preview}
      source={{ html: document.html }}
      style={{ backgroundColor: background }}
    />
  );
}

const boundaryTapScript = `
var bookwormBoundaries = {};
document.querySelectorAll('[data-location]').forEach(function (boundary) {
  bookwormBoundaries[boundary.dataset.location] = boundary;
});
var bookwormSelectionFrame;
var bookwormPendingLocation;
var bookwormSelectedBoundary = document.querySelector('.bookworm-boundary.selected');
window.bookwormSelectBoundary = function (location) {
  bookwormPendingLocation = String(location);
  if (bookwormSelectionFrame) return;
  bookwormSelectionFrame = requestAnimationFrame(function () {
    bookwormSelectionFrame = undefined;
    if (bookwormSelectedBoundary) bookwormSelectedBoundary.classList.remove('selected');
    var nextBoundary = bookwormBoundaries[bookwormPendingLocation];
    if (!nextBoundary) return;
    nextBoundary.classList.add('selected');
    bookwormSelectedBoundary = nextBoundary;
    nextBoundary.scrollIntoView({ block: 'center' });
  });
};
document.addEventListener('click', function (event) {
  var boundary = event.target.closest('[data-location]');
  if (boundary) window.ReactNativeWebView.postMessage(boundary.dataset.location);
});
true;
`;

function selectBoundaryScript(selected: number) {
  return `window.bookwormSelectBoundary?.(${selected}); true;`;
}

const emptyLocations = new Array<EpubLocation>();
