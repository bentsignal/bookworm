import { Pressable, Text, View } from "react-native";
import { Link, Stack } from "expo-router";

import { useLibrary } from "../library-context";

export function WorkbenchScreen() {
  const { books } = useLibrary();
  const projects = books.filter((book) => book.format === "pdf");
  return (
    <View className="bg-background flex-1 px-5 pt-5">
      <Stack.Screen options={{ headerLargeTitle: true, title: "Workbench" }} />
      <WorkbenchContent projects={projects} />
    </View>
  );
}

function WorkbenchContent({
  projects,
}: {
  projects: ReturnType<typeof useLibrary>["books"];
}) {
  if (projects.length === 0) {
    return (
      <View className="flex-1 items-center justify-center pb-28">
        <Text className="text-foreground font-serif text-2xl">
          Nothing on the bench.
        </Text>
        <Text className="text-muted-foreground mt-2 text-[15px]">
          PDF projects appear here.
        </Text>
      </View>
    );
  }
  return (
    <View className="border-border overflow-hidden rounded-2xl border">
      {projects.map((book, index) => (
        <Link href={`/(tabs)/(library)/book/${book.id}`} asChild key={book.id}>
          <Pressable
            className={`bg-card px-4 py-4 active:opacity-70 ${index > 0 ? "border-border border-t" : ""}`}
          >
            <View className="flex-row items-center justify-between gap-4">
              <View className="min-w-0 flex-1">
                <Text
                  className="text-foreground text-[16px] font-semibold"
                  numberOfLines={1}
                >
                  {book.title}
                </Text>
                <Text className="text-muted-foreground mt-1 text-sm">
                  {book.pageCount ?? 0} pages · {book.sections.length} ranges
                </Text>
              </View>
              <Text className="text-primary text-xl">›</Text>
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
