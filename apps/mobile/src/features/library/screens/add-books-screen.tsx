// eslint-disable-next-line no-restricted-imports -- A stable focus callback prevents the file picker reopening during input rerenders.
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import type { BookImportDraft } from "../library-context";
import { useColor } from "~/hooks/use-color";
import { AddBookDraftEditor } from "../components/add-book-draft-editor";
import { useLibrary } from "../library-context";

export function AddBooksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addBooksToLibrary, isImporting, pickBookDrafts } = useLibrary();
  const [drafts, setDrafts] = useState<BookImportDraft[]>([]);
  const isPicking = useRef(false);
  const shouldOpenPicker = useRef(true);
  const activityColor = useColor("primary");
  const activityForeground = useColor("primary-foreground");

  async function chooseBooks() {
    if (isPicking.current) return;
    isPicking.current = true;
    const picked = await pickBookDrafts();
    if (picked.length > 0) setDrafts((current) => [...current, ...picked]);
    isPicking.current = false;
  }

  useFocusEffect(
    useCallback(() => {
      const frame = shouldOpenPicker.current
        ? requestAnimationFrame(
            () => void pickDrafts(pickBookDrafts, isPicking, setDrafts),
          )
        : undefined;
      shouldOpenPicker.current = false;
      return () => {
        if (frame !== undefined) cancelAnimationFrame(frame);
        shouldOpenPicker.current = true;
      };
    }, [pickBookDrafts]),
  );

  async function addToLibrary() {
    if (!(await addBooksToLibrary(drafts))) return;
    setDrafts([]);
    shouldOpenPicker.current = true;
    router.navigate("/(tabs)/(library)");
  }

  const canAdd =
    drafts.length > 0 &&
    drafts.every(({ title }) => title.trim().length > 0) &&
    !isImporting;

  return (
    <View className="bg-background flex-1">
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAwareScrollView
        bottomOffset={28}
        contentContainerClassName="grow px-5"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom + 108, 128),
          paddingTop: insets.top + 12,
        }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <DraftContent
          activityColor={activityColor}
          activityForeground={activityForeground}
          canAdd={canAdd}
          drafts={drafts}
          isImporting={isImporting}
          onAdd={() => void addToLibrary()}
          onChoose={() => void chooseBooks()}
          onChooseMore={() => void chooseBooks()}
          setDrafts={setDrafts}
        />
      </KeyboardAwareScrollView>
    </View>
  );
}

function DraftContent({
  activityColor,
  activityForeground,
  canAdd,
  drafts,
  isImporting,
  onAdd,
  onChoose,
  onChooseMore,
  setDrafts,
}: {
  activityColor: string;
  activityForeground: string;
  canAdd: boolean;
  drafts: BookImportDraft[];
  isImporting: boolean;
  onAdd: () => void;
  onChoose: () => void;
  onChooseMore: () => void;
  setDrafts: React.Dispatch<React.SetStateAction<BookImportDraft[]>>;
}) {
  if (isImporting && drafts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center pb-24">
        <ActivityIndicator color={activityColor} />
        <Text className="text-muted-foreground mt-3 text-sm">
          Reading books…
        </Text>
      </View>
    );
  }
  if (drafts.length === 0) return <EmptyDrafts onChoose={onChoose} />;
  return (
    <View>
      <DraftsHeader count={drafts.length} onChooseMore={onChooseMore} />
      <View className="gap-4">
        {drafts.map((draft) => (
          <AddBookDraftEditor
            draft={draft}
            key={draft.id}
            onChange={(update) =>
              setDrafts((current) =>
                current.map((item) =>
                  item.id === draft.id ? { ...item, ...update } : item,
                ),
              )
            }
            onRemove={() =>
              setDrafts((current) =>
                current.filter((item) => item.id !== draft.id),
              )
            }
          />
        ))}
      </View>
      <AddToLibraryButton
        activityColor={activityForeground}
        canAdd={canAdd}
        count={drafts.length}
        isImporting={isImporting}
        onAdd={onAdd}
      />
    </View>
  );
}

function AddToLibraryButton({
  activityColor,
  canAdd,
  count,
  isImporting,
  onAdd,
}: {
  activityColor: string;
  canAdd: boolean;
  count: number;
  isImporting: boolean;
  onAdd: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="bg-primary mt-6 h-12 items-center justify-center rounded-full active:opacity-75 disabled:opacity-50"
      disabled={!canAdd}
      onPress={onAdd}
    >
      <AddButtonContent
        activityColor={activityColor}
        count={count}
        isImporting={isImporting}
      />
    </Pressable>
  );
}

function AddButtonContent({
  activityColor,
  count,
  isImporting,
}: {
  activityColor: string;
  count: number;
  isImporting: boolean;
}) {
  if (isImporting) return <ActivityIndicator color={activityColor} />;
  return (
    <Text className="text-primary-foreground text-[15px] font-semibold">
      {addButtonLabel(count)}
    </Text>
  );
}

function EmptyDrafts({ onChoose }: { onChoose: () => void }) {
  const primary = useColor("primary");
  return (
    <View className="flex-1 items-center justify-center pb-2">
      <View className="mb-4 items-center justify-center">
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

function DraftsHeader({
  count,
  onChooseMore,
}: {
  count: number;
  onChooseMore: () => void;
}) {
  return (
    <View className="mb-5 flex-row items-center justify-between">
      <Text className="text-foreground font-serif text-2xl">
        {draftCountLabel(count)}
      </Text>
      <Pressable
        accessibilityRole="button"
        className="border-border bg-card h-10 items-center justify-center rounded-full border px-4 active:opacity-70"
        onPress={onChooseMore}
      >
        <Text className="text-primary text-sm font-semibold">Import more</Text>
      </Pressable>
    </View>
  );
}

async function pickDrafts(
  pickBookDrafts: () => Promise<BookImportDraft[]>,
  isPicking: React.MutableRefObject<boolean>,
  setDrafts: React.Dispatch<React.SetStateAction<BookImportDraft[]>>,
) {
  if (isPicking.current) return;
  isPicking.current = true;
  const picked = await pickBookDrafts();
  if (picked.length > 0) setDrafts((current) => [...current, ...picked]);
  isPicking.current = false;
}

function addButtonLabel(count: number) {
  return count === 1 ? "Add to library" : `Add ${count} books to library`;
}

function draftCountLabel(count: number) {
  return `${count} ${count === 1 ? "book" : "books"}`;
}
