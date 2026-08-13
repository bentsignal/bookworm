import { Stack } from "expo-router";

import { useColor } from "~/hooks/use-color";

export default function SearchLayout() {
  const background = useColor("background");
  const foreground = useColor("foreground");
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: background },
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: background },
        headerTintColor: foreground,
      }}
    />
  );
}
