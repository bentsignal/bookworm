import { useRef, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ReaderSelectionMessage } from "../reader-annotations";
import type { ReaderAnnotation } from "~/db/catalog";
import { useColor } from "~/hooks/use-color";

export function AnnotationNoteModal({
  annotation,
  draft,
  onClose,
  onDelete,
  onSave,
  onUpdate,
}: {
  annotation?: ReaderAnnotation;
  draft?: ReaderSelectionMessage;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave: (note: string) => void;
  onUpdate: (id: string, note: string) => void;
}) {
  if (draft) {
    return (
      <NoteEditor
        key={`${draft.startOffset}:${draft.endOffset}`}
        onClose={onClose}
        onSave={onSave}
        quote={draft.selectedText}
        title="Add note"
      />
    );
  }
  if (!annotation) return null;
  return (
    <NoteEditor
      initialValue={annotation.note ?? ""}
      key={`${annotation.id}:${annotation.updatedAt}`}
      onClose={onClose}
      onDelete={() => onDelete(annotation.id)}
      onSave={(note) => onUpdate(annotation.id, note)}
      quote={annotation.selectedText}
      title="Edit note"
    />
  );
}

function NoteEditor({
  initialValue = "",
  onClose,
  onDelete,
  onSave,
  quote,
  title,
}: {
  initialValue?: string;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (note: string) => void;
  quote: string;
  title: string;
}) {
  const note = useRef(initialValue);
  const [canSave, setCanSave] = useState(false);
  const background = useColor("background");
  const card = useColor("card");
  const foreground = useColor("foreground");
  const mutedForeground = useColor("muted-foreground");
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="formSheet"
      visible
    >
      <SafeAreaView className="flex-1" style={{ backgroundColor: background }}>
        <View className="border-border h-16 flex-row items-center justify-between border-b px-5">
          <SheetButton label="Cancel" onPress={onClose} />
          <Text className="text-foreground text-[17px] font-semibold">
            {title}
          </Text>
          <SheetButton
            disabled={!canSave}
            label="Save"
            onPress={() => {
              if (canSave) onSave(note.current.trim());
            }}
          />
        </View>
        <KeyboardAwareScrollView
          bottomOffset={24}
          contentContainerClassName="p-5 pb-10"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-muted-foreground text-sm leading-5">
            “{quote}”
          </Text>
          <TextInput
            autoFocus={!initialValue}
            className="mt-5 min-h-40 rounded-2xl p-4 text-[16px]"
            defaultValue={initialValue}
            multiline
            onChangeText={(value) => {
              note.current = value;
              setCanSave(
                value.trim().length > 0 && value.trim() !== initialValue.trim(),
              );
            }}
            placeholder="Write a note…"
            placeholderTextColor={mutedForeground}
            selectionColor={foreground}
            style={{ backgroundColor: card, color: foreground }}
            textAlignVertical="top"
          />
          <DeleteNoteButton onDelete={onDelete} />
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SheetButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="h-11 min-w-14 items-center justify-center active:opacity-70"
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <Text className="text-primary text-[16px] font-semibold">{label}</Text>
    </Pressable>
  );
}

function DeleteNoteButton({ onDelete }: { onDelete?: () => void }) {
  if (!onDelete) return null;
  return (
    <Pressable
      accessibilityRole="button"
      className="bg-muted mt-8 h-11 items-center justify-center rounded-full active:opacity-75"
      onPress={onDelete}
    >
      <Text className="text-accent text-sm font-semibold">Delete note</Text>
    </Pressable>
  );
}
