import { ActivityIndicator, Pressable, Text } from "react-native";

import { useColor } from "~/hooks/use-color";

export function ImportButton({
  compact = false,
  isImporting,
  onPress,
}: {
  compact?: boolean;
  isImporting: boolean;
  onPress: () => void;
}) {
  const foreground = useColor("primary-foreground");
  if (isImporting) {
    return (
      <Pressable
        accessibilityRole="button"
        className={`bg-primary flex-row items-center justify-center rounded-full ${compact ? "h-9 px-4" : "h-12 px-6"}`}
        disabled
      >
        <ActivityIndicator color={foreground} />
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      className={`bg-primary flex-row items-center justify-center rounded-full ${compact ? "h-9 px-4" : "h-12 px-6"}`}
      disabled={isImporting}
      onPress={onPress}
    >
      <Text className="text-primary-foreground text-[15px] font-semibold">
        Add books
      </Text>
    </Pressable>
  );
}
