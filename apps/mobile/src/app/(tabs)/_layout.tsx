import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useColor } from "~/hooks/use-color";

export default function TabLayout() {
  const background = useColor("background");
  const primary = useColor("primary");
  return (
    <NativeTabs
      backgroundColor={background}
      minimizeBehavior="onScrollDown"
      tintColor={primary}
    >
      <NativeTabs.Trigger
        name="(library)"
        contentStyle={{ backgroundColor: background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "books.vertical", selected: "books.vertical.fill" }}
          md="library_books"
        />
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="(settings)"
        contentStyle={{ backgroundColor: background }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
