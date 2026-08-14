import { Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import type { BookImportDraft } from "../library-context";
import { useColor } from "~/hooks/use-color";
import { BookCover } from "./book-cover";

export function AddBookDraftEditor({
  draft,
  onEdit,
  onPreview,
  onRemove,
}: {
  draft: BookImportDraft;
  onEdit: () => void;
  onPreview: () => void;
  onRemove: () => void;
}) {
  const mutedForeground = useColor("muted-foreground");
  return (
    <View className="border-border bg-card flex-row gap-3 rounded-2xl border p-3">
      <View className="w-12 overflow-hidden rounded-[4px]">
        <BookCover book={draft} scope="import" />
      </View>
      <View className="min-w-0 flex-1 justify-center">
        <Text
          className="text-foreground text-[15px] font-semibold"
          numberOfLines={1}
        >
          {draft.title}
        </Text>
        <Text
          className="text-muted-foreground mt-0.5 text-[13px]"
          numberOfLines={1}
        >
          {draft.author ?? draft.format.toUpperCase()}
        </Text>
        <Text
          className="text-muted-foreground mt-1 text-[11px] tracking-wide uppercase"
          numberOfLines={1}
        >
          {draft.format}
        </Text>
        <View className="mt-2 flex-row gap-2">
          <DraftAction
            label="Preview"
            onPress={onPreview}
            symbol="book.pages"
          />
          <DraftAction
            label="Edit"
            onPress={onEdit}
            symbol="slider.horizontal.3"
          />
        </View>
      </View>
      <Pressable
        accessibilityLabel={`Remove ${draft.title}`}
        accessibilityRole="button"
        className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
        hitSlop={6}
        onPress={onRemove}
      >
        <SymbolView
          fallback={<Text className="text-muted-foreground text-lg">×</Text>}
          name="xmark.circle.fill"
          size={21}
          tintColor={mutedForeground}
        />
      </Pressable>
    </View>
  );
}

function DraftAction({
  label,
  onPress,
  symbol,
}: {
  label: string;
  onPress: () => void;
  symbol: "book.pages" | "slider.horizontal.3";
}) {
  const primary = useColor("primary");
  return (
    <Pressable
      accessibilityRole="button"
      className="bg-muted h-8 flex-row items-center justify-center gap-1.5 rounded-full px-3 active:opacity-65"
      onPress={onPress}
    >
      <SymbolView name={symbol} size={16} tintColor={primary} />
      <Text className="text-primary text-xs font-semibold">{label}</Text>
    </Pressable>
  );
}
