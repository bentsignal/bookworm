import { View } from "react-native";
import { Button, Host } from "@expo/ui/swift-ui";
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
  const primary = useColor("primary");
  const foreground = useColor("foreground");
  const colorScheme = useAppColorScheme();
  if (!onShowAnnotations && !onShowChapters) return null;
  return (
    <View className="w-full flex-row gap-2">
      <NativeReaderAction
        colorScheme={colorScheme}
        foreground={foreground}
        label="Chapters"
        onPress={onShowChapters}
        primary={primary}
        systemImage="list.bullet"
      />
      <NativeReaderAction
        colorScheme={colorScheme}
        foreground={foreground}
        label={annotationCount > 0 ? `Saved ${annotationCount}` : "Saved"}
        onPress={onShowAnnotations}
        primary={primary}
        systemImage="highlighter"
      />
    </View>
  );
}

function NativeReaderAction({
  colorScheme,
  foreground,
  label,
  onPress,
  primary,
  systemImage,
}: {
  colorScheme: "dark" | "light";
  foreground: string;
  label: string;
  onPress?: () => void;
  primary: string;
  systemImage: "highlighter" | "list.bullet";
}) {
  if (!onPress) return null;
  return (
    <Host
      colorScheme={colorScheme}
      seedColor={primary}
      style={{ flex: 1, height: 44 }}
      useViewportSizeMeasurement
    >
      <Button
        label={label}
        modifiers={[
          buttonStyle("bordered"),
          buttonBorderShape("capsule"),
          controlSize("large"),
          font({ textStyle: "subheadline", weight: "semibold" }),
          frame({ height: 44, maxWidth: 1000 }),
          tint(colorScheme === "dark" ? foreground : primary),
        ]}
        onPress={onPress}
        systemImage={systemImage}
      />
    </Host>
  );
}
