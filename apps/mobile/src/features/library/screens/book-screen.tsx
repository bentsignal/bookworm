import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";

import type { BookRecord, BookSection } from "@worm/ebook-core";

import { BookActions, ReadButton } from "../components/book-actions";
import { BookCover } from "../components/book-cover";
import { SectionEditor } from "../components/section-editor";
import { SectionOrganizer } from "../components/section-organizer";
import { useLibrary } from "../library-context";
import { parsePageRange } from "../page-range";

export function BookScreen({ id }: { id: string }) {
  const { books } = useLibrary();
  const book = books.find((item) => item.id === id);
  if (!book) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Text className="text-muted-foreground">Book not found.</Text>
      </View>
    );
  }
  return <BookEditor book={book} />;
}

function BookEditor({ book }: { book: BookRecord }) {
  const router = useRouter();
  const { convertPdfToEpub, deleteBook, exportBook, updateBook } = useLibrary();
  const [isConverting, setIsConverting] = useState(false);

  function updateSection(section: BookSection) {
    updateBook(book.id, {
      sections: book.sections.map((item) =>
        item.id === section.id ? section : item,
      ),
    });
  }

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="px-5 pb-20 pt-5"
      keyboardDismissMode="interactive"
    >
      <Stack.Screen options={{ title: book.title }} />
      <View className="items-center">
        <BookCover book={book} large />
      </View>
      <ReadButton
        format={book.format}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/(library)/book/[id]/read",
            params: { id: book.id },
          })
        }
      />
      <View className="mt-8 gap-4">
        <Field
          label="Title"
          value={book.title}
          onChange={(title) => updateBook(book.id, { title })}
        />
        <Field
          label="Author"
          value={book.author ?? ""}
          onChange={(author) => updateBook(book.id, { author })}
        />
      </View>

      <View className="mt-9 mb-3 flex-row items-end justify-between">
        <View>
          <Text className="text-foreground font-serif text-2xl">
            {structureTitle(book.format)}
          </Text>
          <Text className="text-muted-foreground mt-1 text-sm">
            {sectionCountLabel(book.sections.length)}
          </Text>
        </View>
        <View className="flex-row items-center gap-5">
          <AddRangeButton
            book={book}
            onAdd={(sections) => updateBook(book.id, { sections })}
          />
          <SectionOrganizer
            onChange={(sections) => updateBook(book.id, { sections })}
            sections={book.sections}
          />
        </View>
      </View>
      <SectionEditor
        onChange={updateSection}
        onEditRange={(section) =>
          promptToEditSectionRange(book.pageCount ?? 1, section, updateSection)
        }
        sections={book.sections}
      />

      <BookActions
        convertedEpubUri={book.convertedEpubUri}
        exportedUri={book.exportedUri}
        format={book.format}
        isConverting={isConverting}
        onConvert={() => {
          setIsConverting(true);
          void convertPdfToEpub(book.id).finally(() => setIsConverting(false));
        }}
        onDelete={() => confirmDelete(book, deleteBook, () => router.back())}
        onExport={() => void exportBook(book.id)}
      />
    </ScrollView>
  );
}

function Field({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <View>
      <Text className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
        {label}
      </Text>
      <TextInput
        className="border-border bg-card text-foreground h-12 rounded-xl border px-4 text-[16px]"
        onChangeText={onChange}
        defaultValue={value}
      />
    </View>
  );
}

function AddRangeButton({
  book,
  onAdd,
}: {
  book: ReturnType<typeof useLibrary>["books"][number];
  onAdd: (sections: BookSection[]) => void;
}) {
  if (book.format !== "pdf") return null;
  return (
    <Pressable
      onPress={() =>
        promptForSection(book.pageCount ?? 1, book.sections, onAdd)
      }
    >
      <Text className="text-primary text-[15px] font-semibold">Add range</Text>
    </Pressable>
  );
}

function structureTitle(format: "epub" | "pdf") {
  return format === "pdf" ? "Reading order" : "Chapter order";
}

function sectionCountLabel(count: number) {
  return `${count} ${count === 1 ? "section" : "sections"}`;
}

function confirmDelete(
  book: BookRecord,
  deleteBook: (id: string) => void,
  navigateBack: () => void,
) {
  Alert.alert(
    "Remove this book?",
    "Its Worm copy and generated editions will be deleted.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteBook(book.id);
          navigateBack();
        },
      },
    ],
  );
}

function promptForSection(
  pageCount: number,
  sections: BookSection[],
  onAdd: (sections: BookSection[]) => void,
) {
  promptForPageRange("Add page range", pageCount, undefined, (range) => {
    onAdd([
      ...sections,
      {
        id: `section-${Date.now()}`,
        title: `Pages ${range.start}–${range.end}`,
        included: true,
        startPage: range.start,
        endPage: range.end,
      },
    ]);
  });
}

function promptToEditSectionRange(
  pageCount: number,
  section: BookSection,
  onChange: (section: BookSection) => void,
) {
  const currentRange =
    section.startPage === undefined || section.endPage === undefined
      ? undefined
      : `${section.startPage}–${section.endPage}`;
  promptForPageRange("Edit page range", pageCount, currentRange, (range) => {
    onChange({ ...section, startPage: range.start, endPage: range.end });
  });
}

function promptForPageRange(
  title: string,
  pageCount: number,
  defaultValue: string | undefined,
  onChange: (range: { start: number; end: number }) => void,
) {
  Alert.prompt(
    title,
    `Enter a range between 1 and ${pageCount}, such as 12–28.`,
    (value) => {
      const range = parsePageRange(value, pageCount);
      if (!range) {
        Alert.alert(
          "Invalid range",
          `Use two page numbers between 1 and ${pageCount}.`,
        );
        return;
      }
      onChange(range);
    },
    "plain-text",
    defaultValue,
    "numbers-and-punctuation",
  );
}
