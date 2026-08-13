import { Stack } from "expo-router";

import { useColor } from "~/hooks/use-color";

export default function SearchLayout() {
  const background = useColor("background");
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: background },
        headerShown: false,
      }}
    />
  );
}
