import type { ViewStyle } from "react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { PendingBookImport } from "../import-book-files";

export function ImportListHeader({
  canAdd,
  count,
  isAddingToLibrary,
  onAdd,
  onChooseMore,
  pendingCount,
  spinnerColor,
  style,
}: {
  canAdd: boolean;
  count: number;
  isAddingToLibrary: boolean;
  onAdd: () => void;
  onChooseMore: () => void;
  pendingCount: number;
  spinnerColor: string;
  style: ViewStyle;
}) {
  return (
    <View
      className="border-border bg-background border-b px-5 pb-3"
      style={style}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-foreground font-serif text-2xl">
            {bookCountLabel(count)}
          </Text>
          <ImportingStatus count={pendingCount} />
        </View>
        <Pressable
          accessibilityRole="button"
          className="border-border bg-card h-10 items-center justify-center rounded-full border px-4 active:opacity-70"
          onPress={onChooseMore}
        >
          <Text className="text-primary text-sm font-semibold">
            Import more
          </Text>
        </Pressable>
      </View>
      <AddToLibraryButton
        activityColor={spinnerColor}
        canAdd={canAdd}
        count={count}
        isAdding={isAddingToLibrary}
        onAdd={onAdd}
      />
    </View>
  );
}

export function PendingImports({
  color,
  pendingImports,
}: {
  color: string;
  pendingImports: PendingBookImport[];
}) {
  if (pendingImports.length === 0) return null;
  return (
    <View className="gap-2">
      {pendingImports.map((pending) => (
        <View
          className="border-border bg-card h-16 flex-row items-center gap-3 rounded-2xl border px-4"
          key={pending.id}
        >
          <ActivityIndicator color={color} />
          <View className="min-w-0 flex-1">
            <Text className="text-foreground text-sm font-semibold">
              Reading book…
            </Text>
            <Text
              className="text-muted-foreground mt-0.5 text-xs"
              numberOfLines={1}
            >
              {pending.fileName}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ImportingStatus({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Text className="text-muted-foreground mt-0.5 text-xs">
      Reading {bookCountLabel(count)}…
    </Text>
  );
}

function AddToLibraryButton({
  activityColor,
  canAdd,
  count,
  isAdding,
  onAdd,
}: {
  activityColor: string;
  canAdd: boolean;
  count: number;
  isAdding: boolean;
  onAdd: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="bg-primary mt-3 h-11 items-center justify-center rounded-full active:opacity-75 disabled:opacity-50"
      disabled={!canAdd}
      onPress={onAdd}
    >
      <AddButtonContent
        activityColor={activityColor}
        count={count}
        isAdding={isAdding}
      />
    </Pressable>
  );
}

function AddButtonContent({
  activityColor,
  count,
  isAdding,
}: {
  activityColor: string;
  count: number;
  isAdding: boolean;
}) {
  if (isAdding) return <ActivityIndicator color={activityColor} />;
  return (
    <Text className="text-primary-foreground text-[15px] font-semibold">
      {addButtonLabel(count)}
    </Text>
  );
}

function bookCountLabel(count: number) {
  return `${count} ${count === 1 ? "book" : "books"}`;
}

function addButtonLabel(count: number) {
  if (count === 1) return "Add to library";
  return `Add ${count} books to library`;
}
