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
  const {
    convertPdfToEpub,
    deleteBook,
    exportBook,
    replaceBookCover,
    updateBook,
  } = useLibrary();
  const [isConverting, setIsConverting] = useState(false);

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="px-5 pb-20 pt-5"
      keyboardDismissMode="interactive"
    >
      <Stack.Screen options={{ title: book.title }} />
      <BookDetails
        book={book}
        onChange={(update) => updateBook(book.id, update)}
        onChangeCover={() => void replaceBookCover(book.id)}
        onRead={() =>
          router.push({
            pathname: "/(tabs)/(library)/book/[id]/read",
            params: { id: book.id },
          })
        }
      />
      <BookStructure
        book={book}
        onChange={(sections) => updateBook(book.id, { sections })}
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

function BookDetails({
  book,
  onChange,
  onChangeCover,
  onRead,
}: {
  book: BookRecord;
  onChange: (update: Partial<BookRecord>) => void;
  onChangeCover: () => void;
  onRead: () => void;
}) {
  return (
    <>
      <Pressable
        accessibilityLabel="Change book cover"
        accessibilityRole="button"
        className="items-center"
        onPress={onChangeCover}
      >
        <BookCover book={book} large />
        <Text className="text-primary mt-3 text-sm font-semibold">
          Change cover
        </Text>
      </Pressable>
      <ReadButton format={book.format} onPress={onRead} />
      <View className="mt-8 gap-4">
        <Field
          label="Title"
          value={book.title}
          onChange={(title) => onChange({ title })}
        />
        <Field
          label="Author"
          value={book.author ?? ""}
          onChange={(author) => onChange({ author })}
        />
      </View>
    </>
  );
}

function BookStructure({
  book,
  onChange,
}: {
  book: BookRecord;
  onChange: (sections: BookSection[]) => void;
}) {
  const router = useRouter();
  function editSection(section: BookSection) {
    router.push({
      pathname: "/(tabs)/(library)/book/[id]/section/[sectionId]",
      params: { id: book.id, sectionId: section.id },
    });
  }
  function addSection() {
    const section = createSection(book);
    onChange([...book.sections, section]);
    editSection(section);
  }
  return (
    <>
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
          <Pressable accessibilityRole="button" onPress={addSection}>
            <Text className="text-primary text-[15px] font-semibold">
              Add chapter
            </Text>
          </Pressable>
          <SectionOrganizer onChange={onChange} sections={book.sections} />
        </View>
      </View>
      <SectionEditor
        format={book.format}
        locations={book.epubLocations}
        onDelete={(section) => confirmDeleteSection(book, section, onChange)}
        onEdit={editSection}
        onToggleIncluded={(section) =>
          onChange(
            book.sections.map((item) =>
              item.id === section.id
                ? { ...item, included: !item.included }
                : item,
            ),
          )
        }
        sections={book.sections}
      />
    </>
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

function structureTitle(format: "epub" | "pdf") {
  return format === "pdf" ? "Reading order" : "Chapter order";
}

function sectionCountLabel(count: number) {
  return `${count} ${count === 1 ? "chapter" : "chapters"}`;
}

function createSection(book: BookRecord) {
  const id = `section-${Date.now()}`;
  return book.format === "pdf"
    ? createPdfSection(book, id)
    : createEpubSection(book, id);
}

function createPdfSection(book: BookRecord, id: string) {
  const previous = book.sections.at(-1);
  const page = Math.min(
    book.pageCount ?? 1,
    (previous?.endPage ?? previous?.startPage ?? 0) + 1,
  );
  return {
    id,
    title: `Chapter ${book.sections.length + 1}`,
    included: true,
    startPage: page,
    endPage: page,
  };
}

function createEpubSection(book: BookRecord, id: string) {
  const previous = book.sections.at(-1);
  const maximum = Math.max(0, (book.epubLocations?.length ?? 1) - 1);
  const location = Math.min(
    maximum,
    (previous?.endLocation ?? previous?.startLocation ?? -1) + 1,
  );
  return {
    id,
    title: `Chapter ${book.sections.length + 1}`,
    included: true,
    href: book.epubLocations?.[location]?.href,
    startLocation: location,
    endLocation: location,
  };
}

function confirmDeleteSection(
  book: BookRecord,
  section: BookSection,
  onDelete: (sections: BookSection[]) => void,
) {
  if (book.sections.length === 1) {
    Alert.alert("Keep one chapter", "A book needs at least one chapter.");
    return;
  }
  Alert.alert("Delete this chapter?", section.title, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: () =>
        onDelete(book.sections.filter((item) => item.id !== section.id)),
    },
  ]);
}

function confirmDelete(
  book: BookRecord,
  deleteBook: (id: string) => void,
  navigateBack: () => void,
) {
  Alert.alert(
    "Remove this book?",
    "Its bookworm copy and generated editions will be deleted.",
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
