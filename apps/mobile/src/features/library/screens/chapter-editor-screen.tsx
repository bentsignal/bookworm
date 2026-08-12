import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Host, Slider } from "@expo/ui/swift-ui";

import type { BookRecord, BookSection } from "@worm/ebook-core";

import {
  chapterLocationLabel,
  epubLocationCount,
  initialChapterRange,
  updateChapter,
} from "../chapter-editor-model";
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
  const initial = initialChapterRange(book, section);
  const [title, setTitle] = useState(section.title);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [boundary, setBoundary] = useState<Boundary>("start");
  const selected = boundary === "start" ? start : end;
  const maximum =
    book.format === "pdf" ? (book.pageCount ?? 1) : epubLocationCount(book);

  function setSelected(value: number) {
    const rounded = Math.round(value);
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
      <ChapterPreview book={book} selected={selected} />
      <View className="border-border bg-card gap-4 border-t px-5 pt-5 pb-7">
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
        <View>
          <View className="mb-1 flex-row justify-between">
            <Text className="text-muted-foreground text-xs">1</Text>
            <Text className="text-muted-foreground text-xs">{maximum}</Text>
          </View>
          <Host style={{ height: 44 }}>
            <Slider
              max={maximum}
              min={1}
              onValueChange={setSelected}
              step={1}
              value={selected}
            />
          </Host>
        </View>
        <LocationSummary book={book} selected={selected} />
      </View>
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

function LocationSummary({
  book,
  selected,
}: {
  book: BookRecord;
  selected: number;
}) {
  if (book.format === "pdf") {
    return (
      <Text className="text-muted-foreground text-center text-sm">
        Previewing PDF page {selected} of {book.pageCount ?? 1}
      </Text>
    );
  }
  const location = book.epubLocations?.[selected - 1];
  return (
    <View>
      <Text className="text-foreground text-center text-sm font-semibold">
        {location?.title ?? `Location ${selected}`}
      </Text>
      <Text
        className="text-muted-foreground mt-1 text-center text-xs leading-4"
        numberOfLines={2}
      >
        {location?.excerpt ??
          `EPUB location ${selected} of ${epubLocationCount(book)}`}
      </Text>
    </View>
  );
}

function MissingChapter() {
  return (
    <View className="bg-background flex-1 items-center justify-center">
      <Text className="text-muted-foreground">Chapter not found.</Text>
    </View>
  );
}
