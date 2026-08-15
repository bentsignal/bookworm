import { Button, HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  font,
  foregroundStyle,
  lineLimit,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  listRowSeparatorTint,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import type { ReaderAnnotation } from "~/db/catalog";

export function NativeAnnotationRow({
  annotation,
  background,
  border,
  foreground,
  last,
  mutedForeground,
  onPress,
  primary,
}: {
  annotation: ReaderAnnotation;
  background: string;
  border: string;
  foreground: string;
  last: boolean;
  mutedForeground: string;
  onPress: () => void;
  primary: string;
}) {
  return (
    <Button
      modifiers={[
        buttonStyle("plain"),
        listRowBackground(background),
        listRowInsets({ bottom: 13, leading: 20, top: 13, trailing: 16 }),
        listRowSeparator(last ? "hidden" : "visible", "bottom"),
        listRowSeparatorTint(border, "bottom"),
        tint(primary),
      ]}
      onPress={onPress}
    >
      <HStack alignment="center" spacing={12}>
        <VStack alignment="leading" spacing={5}>
          <Text
            modifiers={[
              font({ textStyle: "caption", weight: "semibold" }),
              foregroundStyle(primary),
            ]}
          >
            {annotationKindLabel(annotation)}
          </Text>
          <Text
            modifiers={[
              font({ textStyle: "body" }),
              foregroundStyle(foreground),
              lineLimit(3),
            ]}
          >
            {`“${annotation.selectedText}”`}
          </Text>
          <AnnotationNote color={mutedForeground} note={annotation.note} />
        </VStack>
        <Spacer />
        <Image color={mutedForeground} size={12} systemName="chevron.right" />
      </HStack>
    </Button>
  );
}

function AnnotationNote({
  color,
  note,
}: {
  color: string;
  note: string | null;
}) {
  if (!note) return null;
  return (
    <Text
      modifiers={[
        font({ textStyle: "subheadline" }),
        foregroundStyle(color),
        lineLimit(2),
      ]}
    >
      {note}
    </Text>
  );
}

function annotationKindLabel(annotation: ReaderAnnotation) {
  return annotation.kind === "note" ? "NOTE" : "HIGHLIGHT";
}
