import { Stack } from "expo-router";

import { useColor } from "~/hooks/use-color";

export default function AddBooksLayout() {
  const background = useColor("background");
  const foreground = useColor("foreground");
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: background },
        headerTintColor: foreground,
      }}
    />
  );
}
