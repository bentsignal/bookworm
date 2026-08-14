import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import type { BookSection } from "@worm/ebook-core";

import { useColor } from "~/hooks/use-color";

export function ChapterBrowserModal({
  currentIndex,
  onClose,
  onSelect,
  sections,
  visible,
}: {
  currentIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
  sections: BookSection[];
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const background = useColor("background");
  if (!visible) return null;
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible
    >
      <View
        style={{
          backgroundColor: background,
          flex: 1,
          paddingBottom: insets.bottom,
        }}
      >
        <ChapterBrowserHeader onClose={onClose} />
        <FlatList
          contentContainerStyle={{ paddingBottom: 24 }}
          data={sections}
          getItemLayout={(_, index) => ({
            index,
            length: chapterRowHeight,
            offset: chapterRowHeight * index,
          })}
          initialScrollIndex={currentIndex}
          keyExtractor={(section) => section.id}
          renderItem={({ index, item }) => (
            <ChapterRow
              current={index === currentIndex}
              index={index}
              onPress={() => onSelect(index)}
              section={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

function ChapterBrowserHeader({ onClose }: { onClose: () => void }) {
  return (
    <View className="border-border h-16 flex-row items-center justify-between border-b px-5">
      <View className="w-14" />
      <Text className="text-foreground text-[17px] font-semibold">
        Chapters
      </Text>
      <Pressable
        accessibilityLabel="Close chapters"
        accessibilityRole="button"
        className="h-11 w-14 items-end justify-center"
        hitSlop={8}
        onPress={onClose}
      >
        <Text className="text-primary text-[16px] font-semibold">Done</Text>
      </Pressable>
    </View>
  );
}

function ChapterRow({
  current,
  index,
  onPress,
  section,
}: {
  current: boolean;
  index: number;
  onPress: () => void;
  section: BookSection;
}) {
  const primary = useColor("primary");
  return (
    <Pressable
      accessibilityHint={current ? "Current chapter" : "Opens this chapter"}
      accessibilityRole="button"
      className="border-border active:bg-muted mx-5 flex-row items-center gap-3 border-b px-1"
      onPress={onPress}
      style={{ height: chapterRowHeight }}
    >
      <Text className="text-muted-foreground w-8 text-right text-xs tabular-nums">
        {index + 1}
      </Text>
      <Text
        className={`min-w-0 flex-1 text-[16px] ${current ? "text-primary font-semibold" : "text-foreground"}`}
        numberOfLines={2}
      >
        {section.title}
      </Text>
      <CurrentChapterIndicator current={current} tintColor={primary} />
    </Pressable>
  );
}

function CurrentChapterIndicator({
  current,
  tintColor,
}: {
  current: boolean;
  tintColor: string;
}) {
  if (!current) return null;
  return (
    <SymbolView
      name="checkmark"
      size={15}
      tintColor={tintColor}
      weight="semibold"
    />
  );
}

const chapterRowHeight = 64;
