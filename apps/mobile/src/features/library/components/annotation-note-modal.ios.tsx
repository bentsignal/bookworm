import { useRef, useState } from "react";
import { Modal, Text as ReactText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Host,
  Spacer,
  Text,
  TextField,
  useNativeState,
  VStack,
} from "@expo/ui/swift-ui";
import {
  background as backgroundModifier,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  shapes,
  strokeBorder,
  textFieldStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import type { ReaderSelectionMessage } from "../reader-annotations";
import type { ReaderAnnotation } from "~/db/catalog";
import { useAppColorScheme } from "~/features/theme/app-appearance";
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
      <NativeNoteEditor
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
    <NativeNoteEditor
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

// eslint-disable-next-line max-lines-per-function -- Keeping the native form and its theme modifiers together makes the sheet's visual hierarchy easier to audit.
function NativeNoteEditor({
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
  const note = useNativeState(initialValue);
  const latestNote = useRef(initialValue);
  const [canSave, setCanSave] = useState(false);
  const background = useColor("background");
  const border = useColor("border");
  const card = useColor("card");
  const foreground = useColor("foreground");
  const muted = useColor("muted");
  const mutedForeground = useColor("muted-foreground");
  const primary = useColor("primary");
  const accent = useColor("accent");
  const colorScheme = useAppColorScheme();
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="formSheet"
      visible
    >
      <SafeAreaView
        edges={["top", "bottom"]}
        style={{ backgroundColor: background, flex: 1 }}
      >
        <NativeNoteHeader
          canSave={canSave}
          colorScheme={colorScheme}
          foreground={foreground}
          onClose={onClose}
          onSave={() => onSave(latestNote.current.trim())}
          primary={primary}
          title={title}
        />
        <Host
          colorScheme={colorScheme}
          seedColor={primary}
          style={{ flex: 1 }}
          useViewportSizeMeasurement
        >
          <VStack
            alignment="leading"
            modifiers={[
              frame({ maxWidth: 1000, alignment: "topLeading" }),
              padding({ bottom: 24, horizontal: 18, top: 16 }),
            ]}
            spacing={16}
          >
            <Text
              modifiers={[
                frame({ maxWidth: 1000, alignment: "leading" }),
                font({ textStyle: "subheadline" }),
                foregroundStyle(mutedForeground),
                lineLimit(4),
                padding({ horizontal: 14, vertical: 12 }),
                backgroundModifier(
                  muted,
                  shapes.roundedRectangle({
                    cornerRadius: 14,
                    roundedCornerStyle: "continuous",
                  }),
                ),
              ]}
            >
              {`“${quote}”`}
            </Text>
            <TextField
              autoFocus={!initialValue}
              axis="vertical"
              modifiers={[
                textFieldStyle("plain"),
                frame({
                  minHeight: 164,
                  maxWidth: 1000,
                  alignment: "topLeading",
                }),
                font({ textStyle: "body" }),
                foregroundStyle(foreground),
                lineLimit({ max: 10, min: 6 }),
                padding({ all: 14 }),
                backgroundModifier(
                  card,
                  shapes.roundedRectangle({
                    cornerRadius: 14,
                    roundedCornerStyle: "continuous",
                  }),
                ),
                strokeBorder({ color: border, cornerRadius: 14 }),
              ]}
              onTextChange={(value) => {
                latestNote.current = value;
                setCanSave(
                  value.trim().length > 0 &&
                    value.trim() !== initialValue.trim(),
                );
              }}
              placeholder="Write a note…"
              text={note}
            />
            <DeleteNoteButton accent={accent} onDelete={onDelete} />
            <Spacer />
          </VStack>
        </Host>
      </SafeAreaView>
    </Modal>
  );
}

function NativeNoteHeader({
  canSave,
  colorScheme,
  foreground,
  onClose,
  onSave,
  primary,
  title,
}: {
  canSave: boolean;
  colorScheme: "dark" | "light";
  foreground: string;
  onClose: () => void;
  onSave: () => void;
  primary: string;
  title: string;
}) {
  const border = useColor("border");
  return (
    <View
      className="h-[68px] flex-row items-center justify-between border-b px-3 pt-1"
      style={{ borderColor: border }}
    >
      <NativeHeaderButton
        colorScheme={colorScheme}
        label="Cancel"
        onPress={onClose}
        primary={primary}
      />
      <ReactText
        className="min-w-0 flex-1 text-center text-[17px] font-semibold"
        numberOfLines={1}
        style={{ color: foreground }}
      >
        {title}
      </ReactText>
      <NativeHeaderButton
        colorScheme={colorScheme}
        disabled={!canSave}
        label="Save"
        onPress={onSave}
        primary={primary}
      />
    </View>
  );
}

function NativeHeaderButton({
  colorScheme,
  disabled: isDisabled = false,
  label,
  onPress,
  primary,
}: {
  colorScheme: "dark" | "light";
  disabled?: boolean;
  label: string;
  onPress: () => void;
  primary: string;
}) {
  return (
    <Host
      colorScheme={colorScheme}
      seedColor={primary}
      style={{ alignItems: "center", height: 44, width: 72 }}
    >
      <Button
        label={label}
        modifiers={[
          buttonStyle("plain"),
          font({ textStyle: "body", weight: "semibold" }),
          tint(primary),
          disabled(isDisabled),
        ]}
        onPress={onPress}
      />
    </Host>
  );
}

function DeleteNoteButton({
  accent,
  onDelete,
}: {
  accent: string;
  onDelete?: () => void;
}) {
  if (!onDelete) return null;
  return (
    <Button
      label="Delete note"
      modifiers={[
        buttonStyle("bordered"),
        buttonBorderShape("capsule"),
        controlSize("large"),
        frame({ height: 44, maxWidth: 1000 }),
        tint(accent),
      ]}
      onPress={onDelete}
      role="destructive"
    />
  );
}
