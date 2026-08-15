import { useWindowDimensions } from "react-native";
import { Button, Host, HStack } from "@expo/ui/swift-ui";
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  font,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";

import { useAppColorScheme } from "~/features/theme/app-appearance";
import { useColor } from "~/hooks/use-color";

export function ReaderSecondaryActions({
  annotationCount = 0,
  onShowAnnotations,
  onShowChapters,
}: {
  annotationCount?: number;
  onShowAnnotations?: () => void;
  onShowChapters?: () => void;
}) {
  const { width } = useWindowDimensions();
  const primary = useColor("primary");
  const colorScheme = useAppColorScheme();
  if (!onShowAnnotations && !onShowChapters) return null;
  const buttonWidth = Math.max(120, (width - 64) / 2);
  return (
    <Host
      colorScheme={colorScheme}
      seedColor={primary}
      style={{ height: 44 }}
      useViewportSizeMeasurement
    >
      <HStack spacing={8}>
        <NativeReaderAction
          label="Chapters"
          onPress={onShowChapters}
          primary={primary}
          systemImage="list.bullet"
          width={buttonWidth}
        />
        <NativeReaderAction
          label={annotationCount > 0 ? `Saved ${annotationCount}` : "Saved"}
          onPress={onShowAnnotations}
          primary={primary}
          systemImage="highlighter"
          width={buttonWidth}
        />
      </HStack>
    </Host>
  );
}

function NativeReaderAction({
  label,
  onPress,
  primary,
  systemImage,
  width,
}: {
  label: string;
  onPress?: () => void;
  primary: string;
  systemImage: "highlighter" | "list.bullet";
  width: number;
}) {
  if (!onPress) return null;
  return (
    <Button
      label={label}
      modifiers={[
        buttonStyle("bordered"),
        buttonBorderShape("capsule"),
        controlSize("large"),
        font({ textStyle: "subheadline", weight: "semibold" }),
        frame({ height: 44, width }),
        tint(primary),
      ]}
      onPress={onPress}
      systemImage={systemImage}
    />
  );
}
