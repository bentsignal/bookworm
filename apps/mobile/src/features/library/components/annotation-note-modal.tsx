import { useRef } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ReaderSelectionMessage } from "../reader-annotations";
import type { ReaderAnnotation } from "~/db/catalog";

export function AnnotationNoteModal({
  annotation,
  draft,
  onClose,
  onDelete,
  onSave,
}: {
  annotation?: ReaderAnnotation;
  draft?: ReaderSelectionMessage;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave: (note: string) => void;
}) {
  if (draft) {
    return (
      <NoteComposer
        draft={draft}
        key={`${draft.startOffset}:${draft.endOffset}`}
        onClose={onClose}
        onSave={onSave}
      />
    );
  }
  if (annotation) {
    return (
      <NoteViewer
        annotation={annotation}
        onClose={onClose}
        onDelete={onDelete}
      />
    );
  }
  return null;
}

function NoteComposer({
  draft,
  onClose,
  onSave,
}: {
  draft: ReaderSelectionMessage;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const note = useRef("");
  return (
    <NoteSheet
      action={
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const value = note.current.trim();
            if (value) onSave(value);
          }}
        >
          <Text className="text-primary text-[16px] font-semibold">Save</Text>
        </Pressable>
      }
      onClose={onClose}
      quote={draft.selectedText}
      title="Add note"
    >
      <TextInput
        autoFocus
        className="border-border bg-card text-foreground mt-5 min-h-36 rounded-2xl border p-4 text-[16px]"
        multiline
        onChangeText={(value) => {
          note.current = value;
        }}
        placeholder="Write a note…"
        placeholderTextColor="#7d8580"
        textAlignVertical="top"
      />
    </NoteSheet>
  );
}

function NoteViewer({
  annotation,
  onClose,
  onDelete,
}: {
  annotation: ReaderAnnotation;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <NoteSheet onClose={onClose} quote={annotation.selectedText} title="Note">
      <Text className="text-foreground mt-6 text-lg leading-7">
        {annotation.note}
      </Text>
      <Pressable
        accessibilityRole="button"
        className="bg-muted mt-10 h-11 items-center justify-center rounded-full"
        onPress={() => onDelete(annotation.id)}
      >
        <Text className="text-accent text-sm font-semibold">Delete note</Text>
      </Pressable>
    </NoteSheet>
  );
}

function NoteSheet({
  action,
  children,
  onClose,
  quote,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  quote: string;
  title: string;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible
    >
      <SafeAreaView className="bg-background flex-1">
        <View className="border-border flex-row items-center justify-between border-b px-5 py-3">
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Text className="text-primary text-[16px]">Cancel</Text>
          </Pressable>
          <Text className="text-foreground text-[16px] font-semibold">
            {title}
          </Text>
          <View className="min-w-12 items-end">{action}</View>
        </View>
        <KeyboardAwareScrollView
          bottomOffset={24}
          contentContainerClassName="p-5"
          keyboardDismissMode="interactive"
        >
          <Text className="text-muted-foreground text-sm leading-5">
            “{quote}”
          </Text>
          {children}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </Modal>
  );
}
