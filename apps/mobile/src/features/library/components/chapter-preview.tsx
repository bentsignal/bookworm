import type { LegendListRef } from "@legendapp/list/react-native";
import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { LegendList } from "@legendapp/list/react-native";

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
  const preview = useRef<LegendListRef>(null);
  const locations = book.epubLocations ?? emptyLocations;

  // eslint-disable-next-line no-restricted-syntax -- Scrubbing moves the native virtualized list without rebuilding any EPUB content.
  useEffect(() => {
    if (locations.length === 0) return;
    const frame = requestAnimationFrame(() => {
      void preview.current?.scrollToIndex({
        animated: false,
        index: Math.min(selected - 1, locations.length - 1),
        viewPosition: 0.45,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [locations.length, selected]);

  return (
    <LegendList
      contentContainerStyle={{
        paddingBottom: 120,
        paddingHorizontal: 20,
        paddingTop: 24,
      }}
      data={locations}
      estimatedItemSize={72}
      extraData={selected}
      initialScrollIndex={{
        index: Math.max(0, selected - 1),
        viewPosition: 0.45,
      }}
      keyExtractor={locationKey}
      keyboardDismissMode="interactive"
      maintainVisibleContentPosition={{ data: false, size: true }}
      ref={preview}
      recycleItems
      renderItem={({ index, item }) => (
        <LocationRow
          location={item}
          onPress={() => onSelect(index + 1)}
          selected={selected === index + 1}
        />
      )}
      style={{ flex: 1 }}
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
      className={`border-l-[3px] px-4 py-2 ${selected ? "border-primary bg-muted rounded-md" : "border-transparent"}`}
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
  return <View className="bg-primary mt-2 h-1 w-8 rounded-full" />;
}

function locationKey(location: EpubLocation, index: number) {
  return `${location.href}:${location.startOffset ?? location.index}:${index}`;
}

const emptyLocations = new Array<EpubLocation>();
