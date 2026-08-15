import { Button, HStack, Image, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  font,
  foregroundStyle,
  lineLimit,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import type { ReaderAnnotation } from "~/db/catalog";

export function NativeAnnotationRow({
  annotation,
  card,
  foreground,
  mutedForeground,
  onPress,
  primary,
}: {
  annotation: ReaderAnnotation;
  card: string;
  foreground: string;
  mutedForeground: string;
  onPress: () => void;
  primary: string;
}) {
  return (
    <Button
      modifiers={[
        buttonStyle("plain"),
        listRowBackground(card),
        listRowInsets({ bottom: 12, leading: 16, top: 12, trailing: 12 }),
        listRowSeparator("visible", "bottom"),
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
