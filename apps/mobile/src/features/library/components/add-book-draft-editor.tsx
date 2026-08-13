import { Pressable, Text, TextInput, View } from "react-native";
import { SymbolView } from "expo-symbols";

import type { BookImportDraft } from "../library-context";
import { useColor } from "~/hooks/use-color";

export function AddBookDraftEditor({
  draft,
  onChange,
  onRemove,
}: {
  draft: BookImportDraft;
  onChange: (
    update: Partial<Pick<BookImportDraft, "author" | "title">>,
  ) => void;
  onRemove: () => void;
}) {
  const mutedForeground = useColor("muted-foreground");
  return (
    <View className="border-border bg-card overflow-hidden rounded-2xl border">
      <View className="flex-row items-center gap-3 p-4">
        <View className="bg-muted h-11 w-11 items-center justify-center rounded-xl">
          <SymbolView
            fallback={<Text className="text-muted-foreground">•</Text>}
            name={
              draft.format === "epub" ? "book.closed.fill" : "doc.richtext.fill"
            }
            size={22}
            tintColor={mutedForeground}
            type="hierarchical"
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-foreground text-sm font-semibold">
            {draft.format.toUpperCase()}
          </Text>
          <Text
            className="text-muted-foreground mt-1 text-xs"
            numberOfLines={1}
          >
            {draft.sourceFileName}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Remove ${draft.title}`}
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
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
      <View className="border-border border-t">
        <DraftField
          label="Title"
          onChange={(title) => onChange({ title })}
          value={draft.title}
        />
        <View className="border-border ml-4 border-t">
          <DraftField
            label="Author"
            onChange={(author) => onChange({ author })}
            value={draft.author ?? ""}
          />
        </View>
      </View>
    </View>
  );
}

function DraftField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <View className="h-13 flex-row items-center px-4">
      <Text className="text-muted-foreground w-16 text-[13px] font-medium">
        {label}
      </Text>
      <TextInput
        className="text-foreground h-13 min-w-0 flex-1 text-right text-[16px]"
        defaultValue={value}
        onChangeText={onChange}
        returnKeyType="done"
      />
    </View>
  );
}
