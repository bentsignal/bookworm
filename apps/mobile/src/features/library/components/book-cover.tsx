import { Image, Text, View } from "react-native";

import type { BookRecord } from "@worm/ebook-core";

import type { BookScope } from "~/db/catalog";
import { getCoverFile } from "../library-storage";

const palettes = [
  ["#123e31", "#f3ead8", "#ef5b3f"],
  ["#7b3328", "#fff0d4", "#1d493d"],
  ["#263a5a", "#f5e8ca", "#d75c3c"],
  ["#5a4930", "#fff5dd", "#8e2e27"],
] as const;

export function BookCover({
  book,
  large = false,
  scope = "library",
}: {
  book: BookRecord;
  large?: boolean;
  scope?: BookScope;
}) {
  const palette = palettes[hash(book.id) % palettes.length] ?? palettes[0];
  const [background, foreground, accent] = palette;
  const metrics = getMetrics(large);
  const cover = getCoverFile(book, scope);
  if (cover?.exists) {
    return (
      <Image
        accessibilityLabel={`${book.title} cover`}
        resizeMode="cover"
        source={{ uri: cover.uri }}
        style={{
          aspectRatio: 0.68,
          borderRadius: 5,
          width: large ? 176 : "100%",
        }}
      />
    );
  }
  return (
    <View
      className="overflow-hidden rounded-[5px]"
      style={{
        aspectRatio: 0.68,
        backgroundColor: background,
        padding: metrics.padding,
        width: large ? 176 : "100%",
      }}
    >
      <View style={{ backgroundColor: accent, height: 5, width: 34 }} />
      <Text
        numberOfLines={metrics.lines}
        style={{
          color: foreground,
          fontFamily: "Georgia",
          fontSize: metrics.titleSize,
          lineHeight: metrics.lineHeight,
          marginTop: metrics.titleMargin,
        }}
      >
        {book.title}
      </Text>
      <View className="flex-1" />
      <Text
        numberOfLines={2}
        style={{
          color: foreground,
          fontSize: metrics.metaSize,
          letterSpacing: 0.8,
          opacity: 0.72,
          textTransform: "uppercase",
        }}
      >
        {book.author ?? book.format}
      </Text>
    </View>
  );
}

function getMetrics(large: boolean) {
  if (large) {
    return {
      lineHeight: 31,
      lines: 5,
      metaSize: 12,
      padding: 20,
      titleMargin: 22,
      titleSize: 26,
    };
  }
  return {
    lineHeight: 22,
    lines: 4,
    metaSize: 10,
    padding: 14,
    titleMargin: 16,
    titleSize: 18,
  };
}

function hash(value: string) {
  let result = 0;
  for (const character of value) {
    result = (result * 31 + character.charCodeAt(0)) >>> 0;
  }
  return result;
}
