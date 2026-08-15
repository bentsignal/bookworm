import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import type { BookRecord, BookSection } from "@worm/ebook-core";

import type { BookScope } from "~/db/catalog";
import {
  chapterLocationLabel,
  epubLocationCount,
  initialChapterRange,
  updateChapter,
} from "../chapter-editor-model";
import { BookSearchControls } from "../components/book-search-controls";
import { ChapterControlsPanel } from "../components/chapter-controls-panel";
import { ChapterPositionControls } from "../components/chapter-position-controls";
import { ChapterPreview } from "../components/chapter-preview";
import { useLibrary } from "../library-context";

type Boundary = "end" | "start";

export function ChapterEditorScreen({
  id,
  scope,
  sectionId,
}: {
  id: string;
  scope: BookScope;
  sectionId: string;
}) {
  const book = useLibrary((store) =>
    (scope === "library" ? store.books : store.imports).find(
      (item) => item.id === id,
    ),
  );
  const updateBook = useLibrary((store) => store.updateBook);
  const updateImport = useLibrary((store) => store.updateImport);
  const router = useRouter();
  const section = book?.sections.find((item) => item.id === sectionId);
  if (!book || !section) return <MissingChapter />;
  return (
    <ChapterEditor
      book={book}
      onSave={(nextSection) => {
        const update = {
          sections: book.sections.map((item) =>
            item.id === nextSection.id ? nextSection : item,
          ),
        };
        if (scope === "library") updateBook(book.id, update);
        else updateImport(book.id, update);
        router.back();
      }}
      section={section}
      scope={scope}
    />
  );
}

function ChapterEditor({
  book,
  onSave,
  section,
  scope,
}: {
  book: BookRecord;
  onSave: (section: BookSection) => void;
  section: BookSection;
  scope: BookScope;
}) {
  const initial = initialChapterRange(book, section);
  const [title, setTitle] = useState(section.title);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [boundary, setBoundary] = useState<Boundary>("start");
  const [controlsExpanded, setControlsExpanded] = useState(false);
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
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button onPress={save}>Save</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <ChapterPreview
        book={book}
        onSelect={setSelected}
        scope={scope}
        selected={selected}
      />
      <ChapterControlsPanel
        expanded={controlsExpanded}
        onExpandedChange={setControlsExpanded}
      >
        <TextInput
          className="border-border bg-background text-foreground h-12 rounded-xl border px-4 text-[16px]"
          onChangeText={setTitle}
          onFocus={() => setControlsExpanded(true)}
          placeholder="Chapter title"
          defaultValue={title}
        />
        <BookSearchControls
          book={book}
          onFocus={() => setControlsExpanded(true)}
          onNavigate={setSelected}
          selected={selected}
          scope={scope}
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
          onInputFocus={() => setControlsExpanded(true)}
          value={selected}
        />
        <PositionSummary book={book} selected={selected} />
      </ChapterControlsPanel>
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
