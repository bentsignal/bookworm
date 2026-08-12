import type { LegendListRef } from "@legendapp/list/react-native";
import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { LegendList } from "@legendapp/list/react-native";

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
  const preview = useRef<LegendListRef>(null);
  const previousSelected = useRef(selected);
  const skipNextReveal = useRef(false);
  const locations = book.epubLocations ?? emptyLocations;

  // eslint-disable-next-line no-restricted-syntax -- Scrubbing externally controls the virtualized reader's native scroll position.
  useEffect(() => {
    if (previousSelected.current === selected) return;
    previousSelected.current = selected;
    if (skipNextReveal.current) {
      skipNextReveal.current = false;
      return;
    }
    const frame = requestAnimationFrame(() => {
      void preview.current?.scrollToIndex({
        animated: false,
        index: selected - 1,
        viewPosition: 0.45,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected]);

  return (
    <LegendList
      contentContainerStyle={{
        paddingBottom: 120,
        paddingHorizontal: 20,
        paddingTop: 24,
      }}
      data={locations}
      extraData={selected}
      initialScrollIndex={{
        index: Math.max(0, selected - 1),
        viewPosition: 0.45,
      }}
      keyExtractor={locationKey}
      keyboardDismissMode="interactive"
      maintainVisibleContentPosition={{ data: false, size: true }}
      recycleItems={true}
      ref={preview}
      renderItem={({ item, index }) => (
        <LocationRow
          location={item}
          onPress={() => {
            if (selected !== index + 1) skipNextReveal.current = true;
            onSelect(index + 1);
          }}
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
  const text = locationText(location);
  return (
    <Pressable
      accessibilityRole="button"
      className={`relative border-l-[3px] px-4 pt-2 pb-3 ${selected ? "border-primary bg-muted rounded-md" : "border-transparent"}`}
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

const emptyLocations = new Array<EpubLocation>();
