import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import type { ReaderAnnotation } from "~/db/catalog";
import { useColor } from "~/hooks/use-color";

export function AnnotationBrowserModal({
  annotations,
  onClose,
  onSelect,
  visible,
}: {
  annotations: ReaderAnnotation[];
  onClose: () => void;
  onSelect: (annotation: ReaderAnnotation) => void;
  visible: boolean;
}) {
  const [query, setQuery] = useState("");
  const results = filterAnnotations(annotations, query);
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView className="bg-background flex-1">
        <View className="border-border flex-row items-center justify-between border-b px-5 py-3">
          <Text className="text-foreground text-xl font-semibold">
            Notes & highlights
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text className="text-primary text-[16px] font-semibold">Done</Text>
          </Pressable>
        </View>
        <AnnotationSearch setQuery={setQuery} />
        <FlatList
          automaticallyAdjustKeyboardInsets
          contentContainerClassName="p-5 gap-3"
          data={results}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => <EmptyAnnotations searching={!!query} />}
          renderItem={({ item }) => (
            <AnnotationRow annotation={item} onPress={onSelect} />
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

function AnnotationSearch({ setQuery }: { setQuery: (query: string) => void }) {
  const mutedForeground = useColor("muted-foreground");
  return (
    <View className="bg-muted mx-5 mt-4 h-11 flex-row items-center gap-2 rounded-xl px-3">
      <SymbolView
        name="magnifyingglass"
        size={15}
        tintColor={mutedForeground}
        weight="medium"
      />
      <TextInput
        accessibilityLabel="Search notes and highlights"
        autoCapitalize="none"
        autoCorrect={false}
        className="text-foreground min-w-0 flex-1 text-[16px]"
        clearButtonMode="while-editing"
        onChangeText={setQuery}
        placeholder="Search saved passages"
        placeholderTextColor={mutedForeground}
        returnKeyType="search"
      />
    </View>
  );
}

function EmptyAnnotations({ searching }: { searching: boolean }) {
  const title = searching ? "No matches" : "Nothing saved yet";
  const description = searching
    ? "Try another word or phrase."
    : "Select text while reading to add a highlight or note.";
  return (
    <View className="items-center px-8 py-24">
      <Text className="text-foreground text-center text-lg font-semibold">
        {title}
      </Text>
      <Text className="text-muted-foreground mt-2 text-center text-sm leading-5">
        {description}
      </Text>
    </View>
  );
}

function filterAnnotations(annotations: ReaderAnnotation[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return annotations;
  return annotations.filter(
    (annotation) =>
      annotation.selectedText.toLocaleLowerCase().includes(normalized) ||
      annotation.note?.toLocaleLowerCase().includes(normalized),
  );
}

function AnnotationRow({
  annotation,
  onPress,
}: {
  annotation: ReaderAnnotation;
  onPress: (annotation: ReaderAnnotation) => void;
}) {
  const kindLabel = annotation.kind === "note" ? "Note" : "Highlight";
  return (
    <Pressable
      accessibilityRole="button"
      className="bg-card border-border rounded-2xl border p-4 active:opacity-75"
      onPress={() => onPress(annotation)}
    >
      <Text className="text-primary text-xs font-semibold tracking-widest uppercase">
        {kindLabel}
      </Text>
      <Text
        className="text-foreground mt-2 text-[15px] leading-6"
        numberOfLines={3}
      >
        “{annotation.selectedText}”
      </Text>
      <AnnotationNote text={annotation.note} />
    </Pressable>
  );
}

function AnnotationNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <Text className="text-muted-foreground mt-2 text-sm" numberOfLines={2}>
      {text}
    </Text>
  );
}
