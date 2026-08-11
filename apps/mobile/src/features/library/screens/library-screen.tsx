import { FlatList, Pressable, Text, View } from "react-native";
import { Link, Stack } from "expo-router";

import type { BookRecord } from "@worm/ebook-core";

import { BookCover } from "../components/book-cover";
import { ImportButton } from "../components/import-button";
import { useLibrary } from "../library-context";

export function LibraryScreen() {
  const { books, importBooks, isImporting, isReady } = useLibrary();
  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          headerLargeTitle: true,
          title: "Library",
          headerRight: () => (
            <ImportButton
              compact
              isImporting={isImporting}
              onPress={() => void importBooks()}
            />
          ),
        }}
      />
      <LibraryContent
        books={books}
        isImporting={isImporting}
        isReady={isReady}
        onImport={() => void importBooks()}
      />
    </View>
  );
}

function LibraryContent({
  books,
  isImporting,
  isReady,
  onImport,
}: {
  books: BookRecord[];
  isImporting: boolean;
  isReady: boolean;
  onImport: () => void;
}) {
  if (isReady && books.length === 0) {
    return <EmptyLibrary isImporting={isImporting} onImport={onImport} />;
  }
  return (
    <FlatList
      columnWrapperClassName="gap-4"
      contentContainerClassName="gap-7 px-5 pb-32 pt-4"
      data={books}
      keyExtractor={({ id }) => id}
      numColumns={2}
      renderItem={({ item }) => <BookTile book={item} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

function BookTile({ book }: { book: BookRecord }) {
  return (
    <Link href={`/(tabs)/(library)/book/${book.id}`} asChild>
      <Pressable className="min-w-0 flex-1 active:opacity-70">
        <BookCover book={book} />
        <Text
          className="text-foreground mt-3 text-[15px] font-semibold"
          numberOfLines={1}
        >
          {book.title}
        </Text>
        <Text
          className="text-muted-foreground mt-0.5 text-[13px]"
          numberOfLines={1}
        >
          {book.author ?? `${book.sections.length} sections`}
        </Text>
      </Pressable>
    </Link>
  );
}

function EmptyLibrary({
  isImporting,
  onImport,
}: {
  isImporting: boolean;
  onImport: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-10 pb-28">
      <View className="bg-primary mb-7 h-24 w-20 -rotate-3 rounded-[4px] p-4">
        <View className="bg-accent h-1 w-7" />
        <Text className="text-primary-foreground mt-4 font-serif text-lg">
          Worm
        </Text>
      </View>
      <Text className="text-foreground font-serif text-3xl">
        Your shelf is ready.
      </Text>
      <Text className="text-muted-foreground mt-2 mb-7 text-center text-[15px] leading-6">
        Bring in an EPUB or PDF from Files.
      </Text>
      <ImportButton isImporting={isImporting} onPress={onImport} />
    </View>
  );
}
