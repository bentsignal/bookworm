import { Text, View } from "react-native";
import { Button, Host } from "@expo/ui/swift-ui";
import { buttonStyle, font, tint } from "@expo/ui/swift-ui/modifiers";

import { useAppColorScheme } from "~/features/theme/app-appearance";
import { useColor } from "~/hooks/use-color";

export function NativeSheetHeader({
  onClose,
  title,
}: {
  onClose: () => void;
  title: string;
}) {
  const border = useColor("border");
  const foreground = useColor("foreground");
  const primary = useColor("primary");
  const colorScheme = useAppColorScheme();
  return (
    <View
      className="h-[68px] flex-row items-center justify-between border-b px-4 pt-1"
      style={{ borderColor: border }}
    >
      <View className="w-[72px]" />
      <Text
        className="min-w-0 flex-1 text-center text-[17px] font-semibold"
        numberOfLines={1}
        style={{ color: foreground }}
      >
        {title}
      </Text>
      <Host
        colorScheme={colorScheme}
        matchContents
        seedColor={primary}
        style={{ alignItems: "flex-end", minWidth: 72 }}
      >
        <Button
          label="Done"
          modifiers={[
            buttonStyle("plain"),
            font({ textStyle: "body", weight: "semibold" }),
            tint(primary),
          ]}
          onPress={onClose}
        />
      </Host>
    </View>
  );
}
