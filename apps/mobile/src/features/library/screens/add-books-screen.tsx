// eslint-disable-next-line no-restricted-imports -- A stable focus callback prevents the file picker reopening during input rerenders.
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import type { BookImportDraft } from "../library-context";
import { useColor } from "~/hooks/use-color";
import { useLibrary } from "../library-context";

export function AddBooksScreen() {
  const router = useRouter();
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
      <Stack.Screen options={{ title: "Add books" }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          disabled={isImporting}
          onPress={() => void chooseBooks()}
        >
          Choose more
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <KeyboardAwareScrollView
        bottomOffset={108}
        contentContainerClassName="grow px-5 pb-32 pt-5"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <DraftContent
          activityColor={activityColor}
          drafts={drafts}
          isImporting={isImporting}
          onChoose={() => void chooseBooks()}
          setDrafts={setDrafts}
        />
      </KeyboardAwareScrollView>
      <AddBooksFooter
        activityColor={activityForeground}
        canAdd={canAdd}
        count={drafts.length}
        isImporting={isImporting}
        onAdd={() => void addToLibrary()}
      />
    </View>
  );
}

function DraftContent({
  activityColor,
  drafts,
  isImporting,
  onChoose,
  setDrafts,
}: {
  activityColor: string;
  drafts: BookImportDraft[];
  isImporting: boolean;
  onChoose: () => void;
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
    <View className="gap-5">
      {drafts.map((draft) => (
        <DraftEditor
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
  );
}

function AddBooksFooter({
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
  if (count === 0) return null;
  return (
    <View className="bg-background border-border absolute right-0 bottom-0 left-0 border-t px-5 pt-3 pb-8">
      <Pressable
        accessibilityRole="button"
        className="bg-primary h-12 items-center justify-center rounded-full active:opacity-75 disabled:opacity-50"
        disabled={!canAdd}
        onPress={onAdd}
      >
        <AddButtonContent
          activityColor={activityColor}
          count={count}
          isImporting={isImporting}
        />
      </Pressable>
    </View>
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
  return (
    <View className="flex-1 items-center justify-center px-8 pb-24">
      <Text className="text-foreground font-serif text-3xl">Choose books</Text>
      <Text className="text-muted-foreground mt-2 mb-7 text-center text-[15px] leading-6">
        Pick EPUB or PDF files, then check their details before adding them.
      </Text>
      <Pressable
        accessibilityRole="button"
        className="border-border bg-card h-12 items-center justify-center rounded-full border px-6 active:opacity-70"
        onPress={onChoose}
      >
        <Text className="text-foreground text-[15px] font-semibold">
          Choose books
        </Text>
      </Pressable>
    </View>
  );
}

function DraftEditor({
  draft,
  onChange,
  onRemove,
}: {
  draft: BookImportDraft;
  onChange: (
    update: Partial<Pick<BookImportDraft, "author" | "title">>,
  ) => void;
  onRemove: () => void;
}) {
  return (
    <View className="border-border bg-card rounded-2xl border p-4">
      <View className="mb-4 flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1">
          <Text className="text-foreground text-sm font-semibold uppercase">
            {draft.format}
          </Text>
          <Text
            className="text-muted-foreground mt-1 text-xs"
            numberOfLines={1}
          >
            {draft.sourceFileName}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Remove ${draft.title}`}
          accessibilityRole="button"
          className="px-1 py-0.5 active:opacity-60"
          onPress={onRemove}
        >
          <Text className="text-destructive text-sm font-semibold">Remove</Text>
        </Pressable>
      </View>
      <DraftField
        label="Title"
        onChange={(title) => onChange({ title })}
        value={draft.title}
      />
      <View className="mt-4">
        <DraftField
          label="Author"
          onChange={(author) => onChange({ author })}
          value={draft.author ?? ""}
        />
      </View>
    </View>
  );
}

function DraftField({
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
        className="border-border bg-background text-foreground h-12 rounded-xl border px-4 text-[16px]"
        onChangeText={onChange}
        returnKeyType="done"
        defaultValue={value}
      />
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
