import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";

import type { BookSection } from "@worm/ebook-core";
import { moveSection } from "@worm/ebook-core";

import { BookCover } from "../components/book-cover";
import { SectionEditor } from "../components/section-editor";
import { useLibrary } from "../library-context";
import { parsePageRange } from "../page-range";

export function BookScreen({ id }: { id: string }) {
  const router = useRouter();
  const { books, deleteBook, exportBook, updateBook } = useLibrary();
  const book = books.find((item) => item.id === id);

  if (!book) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Text className="text-muted-foreground">Book not found.</Text>
      </View>
    );
  }

  function updateSection(section: BookSection) {
    if (!book) return;
    updateBook(book.id, {
      sections: book.sections.map((item) =>
        item.id === section.id ? section : item,
      ),
    });
  }

  function confirmDelete() {
    if (!book) return;
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
            router.back();
          },
        },
      ],
    );
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
        <AddRangeButton
          book={book}
          onAdd={(sections) => updateBook(book.id, { sections })}
        />
      </View>
      <SectionEditor
        editable={book.format === "pdf"}
        onChange={updateSection}
        onMove={(sectionId, direction) =>
          updateBook(book.id, {
            sections: moveSection(book.sections, sectionId, direction),
          })
        }
        sections={book.sections}
      />

      <Pressable
        className="bg-primary mt-8 h-12 items-center justify-center rounded-full active:opacity-75"
        onPress={() => void exportBook(book.id)}
      >
        <Text className="text-primary-foreground text-[15px] font-semibold">
          {exportLabel(book.format)}
        </Text>
      </Pressable>
      <Text className="text-muted-foreground mt-3 text-center text-xs">
        {exportCaption(book.exportedUri)}
      </Text>
      <Pressable className="mt-9 items-center py-3" onPress={confirmDelete}>
        <Text className="text-accent text-[15px]">Remove from Worm</Text>
      </Pressable>
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

function exportLabel(format: "epub" | "pdf") {
  return format === "pdf" ? "Export clean PDF" : "Share original EPUB";
}

function structureTitle(format: "epub" | "pdf") {
  return format === "pdf" ? "Reading order" : "Detected chapters";
}

function exportCaption(exportedUri: string | undefined) {
  return exportedUri
    ? "Latest edition saved in Files"
    : "Your original stays untouched";
}

function sectionCountLabel(count: number) {
  return `${count} ${count === 1 ? "section" : "sections"}`;
}

function promptForSection(
  pageCount: number,
  sections: BookSection[],
  onAdd: (sections: BookSection[]) => void,
) {
  Alert.prompt(
    "Add page range",
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
    },
    "plain-text",
  );
}
