// eslint-disable-next-line no-restricted-imports -- A stable focus callback prevents the file picker reopening during input rerenders.
import { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import type { BookRecord } from "@worm/ebook-core";

import type { PendingBookImport } from "../import-book-files";
import { useColor } from "~/hooks/use-color";
import { AddBookDraftEditor } from "../components/add-book-draft-editor";
import {
  ImportListHeader,
  PendingImports,
} from "../components/import-list-controls";
import { useLibrary } from "../library-context";

export function AddBooksScreen() {
  const router = useRouter();
  const {
    addBooksToLibrary,
    deleteImport,
    imports,
    isAddingToLibrary,
    isImporting,
    pendingImports,
    pickBookDrafts,
  } = useLibrary();
  const isPicking = useRef(false);
  const offeredPicker = useRef(false);
  const activityColor = useColor("primary");
  const activityForeground = useColor("primary-foreground");

  async function chooseBooks() {
    if (isPicking.current) return;
    isPicking.current = true;
    await pickBookDrafts();
    isPicking.current = false;
  }

  useFocusEffect(
    useCallback(() => {
      const frame =
        !offeredPicker.current && imports.length === 0
          ? requestAnimationFrame(
              () => void pickDrafts(pickBookDrafts, isPicking),
            )
          : undefined;
      offeredPicker.current = true;
      return () => {
        if (frame !== undefined) cancelAnimationFrame(frame);
      };
    }, [imports.length, pickBookDrafts]),
  );

  async function addToLibrary() {
    if (!(await addBooksToLibrary())) return;
    offeredPicker.current = false;
    router.navigate("/(tabs)/(library)");
  }

  const canAdd =
    imports.length > 0 &&
    imports.every(({ title }) => title.trim().length > 0) &&
    !isAddingToLibrary &&
    !isImporting;

  if (imports.length === 0) {
    return (
      <View className="bg-background flex-1">
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyImportState
          activityColor={activityColor}
          pendingImports={pendingImports}
          onChoose={() => void chooseBooks()}
        />
      </View>
    );
  }

  return (
    <ImportDraftList
      activityColor={activityColor}
      activityForeground={activityForeground}
      canAdd={canAdd}
      drafts={imports}
      isAddingToLibrary={isAddingToLibrary}
      onAdd={() => void addToLibrary()}
      onChooseMore={() => void chooseBooks()}
      onRemove={deleteImport}
      pendingImports={pendingImports}
    />
  );
}

function ImportDraftList({
  activityColor,
  activityForeground,
  canAdd,
  drafts,
  isAddingToLibrary,
  onAdd,
  onChooseMore,
  onRemove,
  pendingImports,
}: {
  activityColor: string;
  activityForeground: string;
  canAdd: boolean;
  drafts: BookRecord[];
  isAddingToLibrary: boolean;
  onAdd: () => void;
  onChooseMore: () => void;
  onRemove: (id: string) => void;
  pendingImports: PendingBookImport[];
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />
      <ImportListHeader
        canAdd={canAdd}
        count={drafts.length}
        isAddingToLibrary={isAddingToLibrary}
        onAdd={onAdd}
        onChooseMore={onChooseMore}
        pendingCount={pendingImports.length}
        spinnerColor={activityForeground}
        style={{ paddingTop: insets.top + 10 }}
      />
      <FlatList
        contentContainerClassName="gap-3 px-5 pt-3"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 108, 128),
        }}
        data={drafts}
        keyExtractor={({ id }) => id}
        ListHeaderComponent={
          <PendingImports
            color={activityColor}
            pendingImports={pendingImports}
          />
        }
        renderItem={({ item }) => (
          <AddBookDraftEditor
            draft={item}
            onEdit={() =>
              router.push({
                pathname: "/book/[id]",
                params: { id: item.id, scope: "import" },
              })
            }
            onPreview={() =>
              router.push({
                pathname: "/book/[id]/read",
                params: { id: item.id, scope: "import" },
              })
            }
            onRemove={() => onRemove(item.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function EmptyImportState({
  activityColor,
  pendingImports,
  onChoose,
}: {
  activityColor: string;
  pendingImports: PendingBookImport[];
  onChoose: () => void;
}) {
  const primary = useColor("primary");
  if (pendingImports.length > 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={activityColor} />
        <Text className="text-muted-foreground mt-3 text-sm">
          Reading {pendingLabel(pendingImports.length)}…
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-1 items-center justify-center">
      <View className="mb-3 items-center justify-center">
        <SymbolView
          fallback={<Text className="text-primary text-4xl">+</Text>}
          name="books.vertical.fill"
          size={48}
          tintColor={primary}
          type="hierarchical"
        />
      </View>
      <Pressable
        accessibilityRole="button"
        className="bg-primary h-12 min-w-44 items-center justify-center rounded-full px-7 active:opacity-75"
        onPress={onChoose}
      >
        <Text className="text-primary-foreground text-[15px] font-semibold">
          Import books
        </Text>
      </Pressable>
    </View>
  );
}

async function pickDrafts(
  pickBookDrafts: () => Promise<boolean>,
  isPicking: React.MutableRefObject<boolean>,
) {
  if (isPicking.current) return;
  isPicking.current = true;
  await pickBookDrafts();
  isPicking.current = false;
}

function pendingLabel(count: number) {
  return `${count} ${count === 1 ? "book" : "books"}`;
}
