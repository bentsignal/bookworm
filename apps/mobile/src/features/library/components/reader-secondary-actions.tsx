import { Pressable, Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

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
  const background = useColor("foreground");
  const foreground = useColor("background");
  if (!onShowAnnotations && !onShowChapters) return null;
  return (
    <View className="flex-row gap-2">
      <ReaderAction
        background={background}
        foreground={foreground}
        icon="list.bullet"
        label="Chapters"
        onPress={onShowChapters}
      />
      <ReaderAction
        background={background}
        foreground={foreground}
        icon="highlighter"
        label={annotationCount > 0 ? `Saved ${annotationCount}` : "Saved"}
        onPress={onShowAnnotations}
      />
    </View>
  );
}

function ReaderAction({
  background,
  foreground,
  icon,
  label,
  onPress,
}: {
  background: string;
  foreground: string;
  icon: "highlighter" | "list.bullet";
  label: string;
  onPress?: () => void;
}) {
  if (!onPress) return null;
  return (
    <Pressable
      accessibilityRole="button"
      className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-full active:opacity-75"
      onPress={onPress}
      style={{ backgroundColor: background }}
    >
      <SymbolView
        name={icon}
        size={15}
        tintColor={foreground}
        weight="semibold"
      />
      <Text className="text-sm font-semibold" style={{ color: foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}
