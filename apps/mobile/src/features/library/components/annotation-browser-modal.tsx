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
  const background = useColor("background");
  const border = useColor("border");
  const card = useColor("card");
  const foreground = useColor("foreground");
  const muted = useColor("muted");
  const mutedForeground = useColor("muted-foreground");
  const primary = useColor("primary");
  const results = filterAnnotations(annotations, query);
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView style={{ backgroundColor: background, flex: 1 }}>
        <View
          className="flex-row items-center justify-between border-b px-5 py-3"
          style={{ borderColor: border }}
        >
          <Text className="text-xl font-semibold" style={{ color: foreground }}>
            Notes & highlights
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text
              className="text-[16px] font-semibold"
              style={{ color: primary }}
            >
              Done
            </Text>
          </Pressable>
        </View>
        <AnnotationSearch
          foreground={foreground}
          muted={muted}
          mutedForeground={mutedForeground}
          setQuery={setQuery}
        />
        <FlatList
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ gap: 12, padding: 20 }}
          data={results}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={() => (
            <EmptyAnnotations
              foreground={foreground}
              mutedForeground={mutedForeground}
              searching={!!query}
            />
          )}
          renderItem={({ item }) => (
            <AnnotationRow
              annotation={item}
              border={border}
              card={card}
              foreground={foreground}
              mutedForeground={mutedForeground}
              onPress={onSelect}
              primary={primary}
            />
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

function AnnotationSearch({
  foreground,
  muted,
  mutedForeground,
  setQuery,
}: {
  foreground: string;
  muted: string;
  mutedForeground: string;
  setQuery: (query: string) => void;
}) {
  return (
    <View
      className="mx-5 mt-4 h-11 flex-row items-center gap-2 rounded-xl px-3"
      style={{ backgroundColor: muted }}
    >
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
        className="min-w-0 flex-1 text-[16px]"
        clearButtonMode="while-editing"
        onChangeText={setQuery}
        placeholder="Search saved passages"
        placeholderTextColor={mutedForeground}
        returnKeyType="search"
        style={{ color: foreground }}
      />
    </View>
  );
}

function EmptyAnnotations({
  foreground,
  mutedForeground,
  searching,
}: {
  foreground: string;
  mutedForeground: string;
  searching: boolean;
}) {
  const title = searching ? "No matches" : "Nothing saved yet";
  const description = searching
    ? "Try another word or phrase."
    : "Select text while reading to add a highlight or note.";
  return (
    <View className="items-center px-8 py-24">
      <Text
        className="text-center text-lg font-semibold"
        style={{ color: foreground }}
      >
        {title}
      </Text>
      <Text
        className="mt-2 text-center text-sm leading-5"
        style={{ color: mutedForeground }}
      >
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
  border,
  card,
  foreground,
  mutedForeground,
  onPress,
  primary,
}: {
  annotation: ReaderAnnotation;
  border: string;
  card: string;
  foreground: string;
  mutedForeground: string;
  onPress: (annotation: ReaderAnnotation) => void;
  primary: string;
}) {
  const kindLabel = annotation.kind === "note" ? "Note" : "Highlight";
  return (
    <Pressable
      accessibilityRole="button"
      className="rounded-2xl border p-4 active:opacity-75"
      onPress={() => onPress(annotation)}
      style={{ backgroundColor: card, borderColor: border }}
    >
      <Text
        className="text-xs font-semibold tracking-widest uppercase"
        style={{ color: primary }}
      >
        {kindLabel}
      </Text>
      <Text
        className="mt-2 text-[15px] leading-6"
        numberOfLines={3}
        style={{ color: foreground }}
      >
        “{annotation.selectedText}”
      </Text>
      <AnnotationNote color={mutedForeground} text={annotation.note} />
    </Pressable>
  );
}

function AnnotationNote({
  color,
  text,
}: {
  color: string;
  text: string | null;
}) {
  if (!text) return null;
  return (
    <Text className="mt-2 text-sm" numberOfLines={2} style={{ color }}>
      {text}
    </Text>
  );
}
