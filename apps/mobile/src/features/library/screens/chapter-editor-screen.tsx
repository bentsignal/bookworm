import { useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";

import type { BookRecord, BookSection } from "@worm/ebook-core";

import {
  chapterLocationLabel,
  epubLocationCount,
  initialChapterRange,
  updateChapter,
} from "../chapter-editor-model";
import { ChapterPositionControls } from "../components/chapter-position-controls";
import { ChapterPreview } from "../components/chapter-preview";
import { useLibrary } from "../library-context";

type Boundary = "end" | "start";

export function ChapterEditorScreen({
  id,
  sectionId,
}: {
  id: string;
  sectionId: string;
}) {
  const { books, updateBook } = useLibrary();
  const router = useRouter();
  const book = books.find((item) => item.id === id);
  const section = book?.sections.find((item) => item.id === sectionId);
  if (!book || !section) return <MissingChapter />;
  return (
    <ChapterEditor
      book={book}
      onSave={(nextSection) => {
        updateBook(book.id, {
          sections: book.sections.map((item) =>
            item.id === nextSection.id ? nextSection : item,
          ),
        });
        router.back();
      }}
      section={section}
    />
  );
}

function ChapterEditor({
  book,
  onSave,
  section,
}: {
  book: BookRecord;
  onSave: (section: BookSection) => void;
  section: BookSection;
}) {
  const insets = useSafeAreaInsets();
  const initial = initialChapterRange(book, section);
  const [title, setTitle] = useState(section.title);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [boundary, setBoundary] = useState<Boundary>("start");
  const selected = boundary === "start" ? start : end;
  const maximum =
    book.format === "pdf" ? (book.pageCount ?? 1) : epubLocationCount(book);

  function setSelected(value: number) {
    const rounded = Math.max(1, Math.min(maximum, Math.round(value)));
    if (boundary === "start") {
      setStart(rounded);
      if (rounded > end) setEnd(rounded);
      return;
    }
    setEnd(rounded);
    if (rounded < start) setStart(rounded);
  }

  function save() {
    onSave(updateChapter({ book, end, section, start, title }));
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          headerLargeTitle: false,
          title: "Edit chapter",
          headerRight: () => (
            <Pressable accessibilityRole="button" onPress={save}>
              <Text className="text-primary text-[16px] font-semibold">
                Save
              </Text>
            </Pressable>
          ),
        }}
      />
      <ChapterPreview book={book} onSelect={setSelected} selected={selected} />
      <ScrollView
        alwaysBounceVertical
        automaticallyAdjustKeyboardInsets
        className="border-border bg-card max-h-[65%] border-t"
        contentContainerStyle={{
          gap: 16,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingHorizontal: 20,
          paddingTop: 20,
        }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <TextInput
          className="border-border bg-background text-foreground h-12 rounded-xl border px-4 text-[16px]"
          onChangeText={setTitle}
          placeholder="Chapter title"
          defaultValue={title}
        />
        <BoundaryPicker
          boundary={boundary}
          end={end}
          format={book.format}
          onChange={setBoundary}
          start={start}
        />
        <ChapterPositionControls
          format={book.format}
          maximum={maximum}
          onChange={setSelected}
          value={selected}
        />
        <PositionSummary book={book} selected={selected} />
      </ScrollView>
    </View>
  );
}

function BoundaryPicker({
  boundary,
  end,
  format,
  onChange,
  start,
}: {
  boundary: Boundary;
  end: number;
  format: BookRecord["format"];
  onChange: (boundary: Boundary) => void;
  start: number;
}) {
  return (
    <View className="bg-muted flex-row rounded-xl p-1">
      <BoundaryButton
        active={boundary === "start"}
        label={`Start · ${chapterLocationLabel(format, start)}`}
        onPress={() => onChange("start")}
      />
      <BoundaryButton
        active={boundary === "end"}
        label={`End · ${chapterLocationLabel(format, end)}`}
        onPress={() => onChange("end")}
      />
    </View>
  );
}

function BoundaryButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`flex-1 items-center rounded-lg px-2 py-2.5 ${active ? "bg-card" : ""}`}
      onPress={onPress}
    >
      <Text
        className={`text-[13px] font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PositionSummary({
  book,
  selected,
}: {
  book: BookRecord;
  selected: number;
}) {
  if (book.format !== "pdf") return null;
  return (
    <Text className="text-muted-foreground text-center text-sm">
      Previewing PDF page {selected} of {book.pageCount ?? 1}
    </Text>
  );
}

function MissingChapter() {
  return (
    <View className="bg-background flex-1 items-center justify-center">
      <Text className="text-muted-foreground">Chapter not found.</Text>
    </View>
  );
}
