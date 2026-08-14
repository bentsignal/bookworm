import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ReaderAnnotation } from "~/db/catalog";

export function AnnotationBrowserModal({
  annotations,
  onClose,
  onSelect,
  visible,
}: {
  annotations: ReaderAnnotation[];
  onClose: () => void;
  onSelect: (annotation: ReaderAnnotation) => void;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView className="bg-background flex-1">
        <View className="border-border flex-row items-center justify-between border-b px-5 py-3">
          <Text className="text-foreground text-xl font-semibold">
            Notes & highlights
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text className="text-primary text-[16px] font-semibold">Done</Text>
          </Pressable>
        </View>
        <FlatList
          contentContainerClassName="p-5 gap-3"
          data={annotations}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={EmptyAnnotations}
          renderItem={({ item }) => (
            <AnnotationRow annotation={item} onPress={onSelect} />
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

function EmptyAnnotations() {
  return (
    <View className="items-center px-8 py-24">
      <Text className="text-foreground text-center text-lg font-semibold">
        Nothing saved yet
      </Text>
      <Text className="text-muted-foreground mt-2 text-center text-sm leading-5">
        Select text while reading to add a highlight or note.
      </Text>
    </View>
  );
}

function AnnotationRow({
  annotation,
  onPress,
}: {
  annotation: ReaderAnnotation;
  onPress: (annotation: ReaderAnnotation) => void;
}) {
  const kindLabel = annotation.kind === "note" ? "Note" : "Highlight";
  return (
    <Pressable
      accessibilityRole="button"
      className="bg-card border-border rounded-2xl border p-4 active:opacity-75"
      onPress={() => onPress(annotation)}
    >
      <Text className="text-primary text-xs font-semibold tracking-widest uppercase">
        {kindLabel}
      </Text>
      <Text
        className="text-foreground mt-2 text-[15px] leading-6"
        numberOfLines={3}
      >
        “{annotation.selectedText}”
      </Text>
      <AnnotationNote text={annotation.note} />
    </Pressable>
  );
}

function AnnotationNote({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <Text className="text-muted-foreground mt-2 text-sm" numberOfLines={2}>
      {text}
    </Text>
  );
}
