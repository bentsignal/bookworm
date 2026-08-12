import type { LegendListRef } from "@legendapp/list/react-native";
import { useEffect, useRef } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { LegendList } from "@legendapp/list/react-native";

import type { BookRecord, EpubLocation } from "@worm/ebook-core";

import { WormPdfView } from "~/native/worm-pdf";
import { epubPreviewLayout } from "../epub-preview-layout";
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
  const mounted = useRef(false);
  const skipNextReveal = useRef(false);
  const locations = book.epubLocations ?? emptyLocations;
  const { fontScale, width } = useWindowDimensions();
  const rowWidth = Math.max(200, width - 40);

  function layoutFor(location: EpubLocation) {
    return epubPreviewLayout(locationText(location), rowWidth, fontScale);
  }

  // eslint-disable-next-line no-restricted-syntax -- Scrubbing moves the native virtualized list without rebuilding any EPUB content.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (skipNextReveal.current) {
      skipNextReveal.current = false;
      return;
    }
    const frame = requestAnimationFrame(() => {
      revealLocation(preview, selected, locations.length);
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
      dataKey={book.id}
      estimatedItemSize={88}
      extraData={selected}
      getFixedItemSize={(location) => layoutFor(location).height}
      initialScrollIndex={{
        index: Math.max(0, Math.min(selected - 1, locations.length - 1)),
        viewPosition: 0.45,
      }}
      keyExtractor={locationKey}
      keyboardDismissMode="interactive"
      maintainVisibleContentPosition={false}
      ref={preview}
      recycleItems={false}
      renderItem={({ index, item }) => (
        <LocationRow
          layout={layoutFor(item)}
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
  layout,
  location,
  onPress,
  selected,
}: {
  layout: ReturnType<typeof epubPreviewLayout>;
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
      style={{ height: layout.height }}
    >
      <Text
        className="text-foreground font-serif text-[18px] leading-7"
        maxFontSizeMultiplier={1.4}
        numberOfLines={layout.lineCount}
      >
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
  return location.excerpt || location.title || "Untitled text";
}

function revealLocation(
  preview: React.RefObject<LegendListRef | null>,
  value: number,
  locationCount: number,
) {
  if (locationCount === 0) return;
  void preview.current?.scrollToIndex({
    animated: false,
    index: Math.min(value - 1, locationCount - 1),
    viewPosition: 0.45,
  });
}

const emptyLocations = new Array<EpubLocation>();
