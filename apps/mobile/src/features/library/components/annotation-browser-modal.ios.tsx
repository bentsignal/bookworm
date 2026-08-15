import type { TextFieldRef } from "@expo/ui/swift-ui";
import { useRef, useState } from "react";
import { Modal, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  ContentUnavailableView,
  Host,
  HStack,
  Image,
  List,
  Spacer,
  TextField,
} from "@expo/ui/swift-ui";
import {
  background as backgroundModifier,
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  listStyle,
  padding,
  scrollContentBackground,
  shapes,
  textFieldStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import type { ReaderAnnotation } from "~/db/catalog";
import { useAppColorScheme } from "~/features/theme/app-appearance";
import { useColor } from "~/hooks/use-color";
import { NativeAnnotationRow } from "./annotation-row.ios";
import { NativeSheetHeader } from "./native-sheet-header.ios";

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
  const foreground = useColor("foreground");
  const muted = useColor("muted");
  const mutedForeground = useColor("muted-foreground");
  const primary = useColor("primary");
  const colorScheme = useAppColorScheme();
  const results = filterAnnotations(annotations, query);
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView
        edges={["top", "bottom"]}
        style={{ backgroundColor: background, flex: 1 }}
      >
        <NativeSheetHeader onClose={onClose} title="Notes & highlights" />
        <NativeAnnotationSearch
          background={muted}
          colorScheme={colorScheme}
          foreground={foreground}
          mutedForeground={mutedForeground}
          onChange={setQuery}
          primary={primary}
          query={query}
        />
        <View style={{ flex: 1 }}>
          <AnnotationResults
            background={background}
            border={border}
            colorScheme={colorScheme}
            foreground={foreground}
            mutedForeground={mutedForeground}
            onSelect={onSelect}
            primary={primary}
            query={query}
            results={results}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function NativeAnnotationSearch({
  background,
  colorScheme,
  foreground,
  mutedForeground,
  onChange,
  primary,
  query,
}: {
  background: string;
  colorScheme: "dark" | "light";
  foreground: string;
  mutedForeground: string;
  onChange: (query: string) => void;
  primary: string;
  query: string;
}) {
  const searchRef = useRef<TextFieldRef>(null);
  return (
    <Host
      colorScheme={colorScheme}
      seedColor={primary}
      style={{ height: 40, marginHorizontal: 16, marginVertical: 12 }}
    >
      <HStack
        alignment="center"
        modifiers={[
          frame({ height: 40 }),
          padding({ horizontal: 12 }),
          backgroundModifier(
            background,
            shapes.roundedRectangle({
              cornerRadius: 13,
              roundedCornerStyle: "continuous",
            }),
          ),
        ]}
        spacing={8}
      >
        <Image color={mutedForeground} size={15} systemName="magnifyingglass" />
        <TextField
          ref={searchRef}
          modifiers={[
            textFieldStyle("plain"),
            font({ textStyle: "body" }),
            foregroundStyle(foreground),
          ]}
          onTextChange={onChange}
          placeholder="Search saved passages"
        />
        <Spacer minLength={0} />
        <ClearSearchButton
          mutedForeground={mutedForeground}
          onClear={() => {
            void searchRef.current?.clear();
            onChange("");
          }}
          query={query}
        />
      </HStack>
    </Host>
  );
}

function ClearSearchButton({
  mutedForeground,
  onClear,
  query,
}: {
  mutedForeground: string;
  onClear: () => void;
  query: string;
}) {
  if (!query) return null;
  return (
    <Button
      modifiers={[buttonStyle("plain"), tint(mutedForeground)]}
      onPress={onClear}
      systemImage="xmark.circle.fill"
    />
  );
}

function AnnotationResults({
  background,
  border,
  colorScheme,
  foreground,
  mutedForeground,
  onSelect,
  primary,
  query,
  results,
}: {
  background: string;
  border: string;
  colorScheme: "dark" | "light";
  foreground: string;
  mutedForeground: string;
  onSelect: (annotation: ReaderAnnotation) => void;
  primary: string;
  query: string;
  results: ReaderAnnotation[];
}) {
  if (results.length === 0) {
    const empty = annotationEmptyState(query);
    return (
      <Host colorScheme={colorScheme} seedColor={primary} style={{ flex: 1 }}>
        <ContentUnavailableView {...empty} />
      </Host>
    );
  }
  return (
    <Host colorScheme={colorScheme} seedColor={primary} style={{ flex: 1 }}>
      <List
        modifiers={[
          listStyle("plain"),
          scrollContentBackground("hidden"),
          backgroundModifier(background),
        ]}
      >
        {results.map((annotation) => (
          <NativeAnnotationRow
            annotation={annotation}
            background={background}
            border={border}
            foreground={foreground}
            key={annotation.id}
            last={annotation.id === results.at(-1)?.id}
            mutedForeground={mutedForeground}
            onPress={() => onSelect(annotation)}
            primary={primary}
          />
        ))}
      </List>
    </Host>
  );
}

function annotationEmptyState(query: string) {
  if (query) {
    return {
      description: "Try another word or phrase.",
      systemImage: "magnifyingglass" as const,
      title: "No matches",
    };
  }
  return {
    description: "Select text while reading to add a highlight or note.",
    systemImage: "bookmark" as const,
    title: "Nothing saved yet",
  };
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
