import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import type { BookRecord } from "@worm/ebook-core";

import { BookCover } from "../components/book-cover";
import { useLibrary } from "../library-context";

export function LibraryScreen() {
  const { books, isReady } = useLibrary();
  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />
      <LibraryContent books={books} isReady={isReady} />
    </View>
  );
}

function LibraryContent({
  books,
  isReady,
}: {
  books: BookRecord[];
  isReady: boolean;
}) {
  if (isReady && books.length === 0) {
    return <EmptyLibrary />;
  }
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      columnWrapperClassName="gap-4"
      contentContainerClassName="gap-7 px-5 pb-32"
      data={books}
      keyExtractor={({ id }) => id}
      numColumns={2}
      renderItem={({ item }) => <BookTile book={item} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

export function BookTile({ book }: { book: BookRecord }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityLabel={`${book.title}, ${book.author ?? book.format}`}
      accessibilityRole="button"
      className="min-w-0 active:opacity-70"
      onPress={() =>
        router.push({
          pathname: "/book/[id]/read",
          params: { id: book.id },
        })
      }
      style={{ width: "47%" }}
    >
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
  );
}

function EmptyLibrary() {
  return (
    <View className="flex-1 items-center justify-center px-10 pb-28">
      <View className="bg-primary mb-7 h-24 w-20 -rotate-3 rounded-[4px] p-4">
        <View className="bg-accent h-1 w-7" />
        <Text className="text-primary-foreground mt-4 font-serif text-lg">
          bookworm
        </Text>
      </View>
      <Text className="text-foreground font-serif text-3xl">
        Your shelf is ready.
      </Text>
      <Text className="text-muted-foreground mt-2 text-center text-[15px] leading-6">
        Use the Import tab to bring in an EPUB or PDF from Files.
      </Text>
    </View>
  );
}
