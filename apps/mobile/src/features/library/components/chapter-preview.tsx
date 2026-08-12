import type { LayoutChangeEvent } from "react-native";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { BookRecord, EpubLocation } from "@worm/ebook-core";
import { normalizeEpubWhitespace } from "@worm/ebook-core";

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
        displayMode="continuous"
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
  const preview = useRef<ScrollView>(null);
  const positions = useRef(new Map<number, number>());
  const viewportHeight = useRef(0);
  const pendingReveal = useRef<number | undefined>(selected);
  const skipNextReveal = useRef(false);
  const locations = book.epubLocations ?? emptyLocations;

  // eslint-disable-next-line no-restricted-syntax -- Scrubbing moves the native scroll view without rebuilding any EPUB content.
  useEffect(() => {
    if (skipNextReveal.current) {
      skipNextReveal.current = false;
      return;
    }
    pendingReveal.current = selected;
    const frame = requestAnimationFrame(() => {
      revealLocation(
        preview,
        positions.current,
        viewportHeight.current,
        selected,
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [locations.length, selected]);

  return (
    <ScrollView
      contentContainerStyle={{
        paddingBottom: 120,
        paddingHorizontal: 20,
        paddingTop: 24,
      }}
      keyboardDismissMode="interactive"
      onLayout={(event) => {
        viewportHeight.current = event.nativeEvent.layout.height;
        revealPendingLocation(
          preview,
          positions.current,
          viewportHeight.current,
          pendingReveal,
        );
      }}
      ref={preview}
      style={{ flex: 1 }}
    >
      {locations.map((location, index) => (
        <LocationRow
          key={locationKey(location, index)}
          location={location}
          onLayout={(offset) => {
            positions.current.set(index + 1, offset);
            revealPendingLocation(
              preview,
              positions.current,
              viewportHeight.current,
              pendingReveal,
            );
          }}
          onPress={() => {
            if (selected !== index + 1) {
              pendingReveal.current = undefined;
              skipNextReveal.current = true;
            }
            onSelect(index + 1);
          }}
          selected={selected === index + 1}
        />
      ))}
    </ScrollView>
  );
}

function LocationRow({
  location,
  onLayout,
  onPress,
  selected,
}: {
  location: EpubLocation;
  onLayout: (offset: number) => void;
  onPress: () => void;
  selected: boolean;
}) {
  const text = locationText(location);
  return (
    <Pressable
      accessibilityRole="button"
      className={`relative border-l-[3px] px-4 pt-2 pb-3 ${selected ? "border-primary bg-muted rounded-md" : "border-transparent"}`}
      onLayout={(event: LayoutChangeEvent) =>
        onLayout(event.nativeEvent.layout.y)
      }
      onPress={onPress}
    >
      <Text className="text-foreground font-serif text-[18px] leading-7">
        {text}
      </Text>
      <SelectedIndicator selected={selected} />
    </Pressable>
  );
}

function SelectedIndicator({ selected }: { selected: boolean }) {
  if (!selected) return null;
  return (
    <View className="bg-primary absolute bottom-1 left-4 h-1 w-8 rounded-full" />
  );
}

function locationKey(location: EpubLocation, index: number) {
  return `${location.href}:${location.startOffset ?? location.index}:${index}`;
}

function locationText(location: EpubLocation) {
  return (
    normalizeEpubWhitespace(location.excerpt) ||
    normalizeEpubWhitespace(location.title) ||
    "Untitled text"
  );
}

function revealLocation(
  preview: React.RefObject<ScrollView | null>,
  positions: Map<number, number>,
  viewportHeight: number,
  value: number,
) {
  const offset = positions.get(value);
  if (offset === undefined || viewportHeight === 0) return false;
  preview.current?.scrollTo({
    animated: false,
    y: Math.max(0, offset - viewportHeight * 0.45),
  });
  return true;
}

function revealPendingLocation(
  preview: React.RefObject<ScrollView | null>,
  positions: Map<number, number>,
  viewportHeight: number,
  pendingReveal: React.MutableRefObject<number | undefined>,
) {
  const value = pendingReveal.current;
  if (value === undefined) return;
  if (revealLocation(preview, positions, viewportHeight, value)) {
    pendingReveal.current = undefined;
  }
}

const emptyLocations = new Array<EpubLocation>();
