import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { Stack } from "expo-router";

import type { BookRecord } from "@worm/ebook-core";

import { useLibrary } from "../library-context";
import { BookTile } from "./library-screen";

export function LibrarySearchScreen() {
  const { books } = useLibrary();
  const [query, setQuery] = useState("");
  const results = searchBooks(books, query);

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerLargeTitle: false, title: "Search" }} />
      <Stack.SearchBar
        autoCapitalize="none"
        onChangeText={({ nativeEvent }) => setQuery(nativeEvent.text)}
        placeholder="Titles, authors, and chapters"
        placement="automatic"
      />
      <FlatList
        columnWrapperClassName="gap-4"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-7 px-5 pb-32 pt-4"
        data={results}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        keyExtractor={({ id }) => id}
        ListEmptyComponent={<EmptySearch query={query} />}
        numColumns={2}
        renderItem={({ item }) => <BookTile book={item} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function searchBooks(books: BookRecord[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return books;
  return books.filter((book) =>
    [
      book.title,
      book.author,
      book.format,
      ...book.sections.map(({ title }) => title),
    ]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(needle)),
  );
}

function EmptySearch({ query }: { query: string }) {
  if (query.trim()) {
    return (
      <SearchMessage
        detail="Try a title, author, format, or chapter name."
        title="No books found"
      />
    );
  }
  return (
    <SearchMessage
      detail="Add a book from the Library tab to search it here."
      title="Your library is empty"
    />
  );
}

function SearchMessage({ detail, title }: { detail: string; title: string }) {
  return (
    <View className="col-span-2 items-center px-8 pt-24">
      <Text className="text-foreground font-serif text-2xl">{title}</Text>
      <Text className="text-muted-foreground mt-2 text-center text-sm leading-5">
        {detail}
      </Text>
    </View>
  );
}
