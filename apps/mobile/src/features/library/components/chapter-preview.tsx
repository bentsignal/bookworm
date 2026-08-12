import { useEffect, useRef } from "react";
import { FlatList, Pressable, Text } from "react-native";

import type { BookRecord, EpubLocation } from "@worm/ebook-core";

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
  const preview = useRef<FlatList<EpubLocation>>(null);
  const locations = book.epubLocations ?? emptyLocations;

  // eslint-disable-next-line no-restricted-syntax -- Scrubbing moves the native virtualized list without rebuilding any EPUB content.
  useEffect(() => {
    if (locations.length === 0) return;
    preview.current?.scrollToIndex({
      animated: false,
      index: Math.min(selected - 1, locations.length - 1),
      viewPosition: 0.5,
    });
  }, [locations.length, selected]);

  return (
    <FlatList
      contentContainerClassName="px-5 py-6"
      data={locations}
      getItemLayout={(_data, index) => ({
        index,
        length: locationRowHeight,
        offset: locationRowHeight * index,
      })}
      initialScrollIndex={Math.max(0, selected - 1)}
      keyExtractor={locationKey}
      keyboardDismissMode="interactive"
      ref={preview}
      renderItem={({ index, item }) => (
        <LocationRow
          location={item}
          onPress={() => onSelect(index + 1)}
          selected={selected === index + 1}
        />
      )}
      style={{ flex: 1 }}
      windowSize={7}
    />
  );
}

function LocationRow({
  location,
  onPress,
  selected,
}: {
  location: EpubLocation;
  onPress: () => void;
  selected: boolean;
}) {
  const text = location.excerpt || location.title || "Untitled text";
  return (
    <Pressable
      accessibilityRole="button"
      className={`h-[120px] justify-center border-l-[3px] px-4 py-3 ${selected ? "border-foreground bg-muted rounded-md" : "border-transparent"}`}
      onPress={onPress}
    >
      <Text
        className="text-foreground font-serif text-[19px] leading-8"
        numberOfLines={3}
      >
        {text}
      </Text>
    </Pressable>
  );
}

function locationKey(location: EpubLocation, index: number) {
  return `${location.href}:${location.startOffset ?? location.index}:${index}`;
}

const emptyLocations = new Array<EpubLocation>();
const locationRowHeight = 120;
