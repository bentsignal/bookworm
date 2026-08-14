import { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { getAppIcon, setAppIcon } from "expo-icon-handler";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";

import {
  appThemes,
  setAppTheme,
  useAppTheme,
} from "~/features/theme/app-appearance";
import { useColor } from "~/hooks/use-color";
import iconForest from "../../../assets/icon.png";
import iconClay from "../../../assets/icons/icon-clay.png";
import iconNavy from "../../../assets/icons/icon-navy.png";
import iconPlum from "../../../assets/icons/icon-plum.png";

const appIcons = [
  { image: iconForest, label: "Forest", nativeName: "IconForest" },
  { image: iconNavy, label: "Ink", nativeName: "IconNavy" },
  { image: iconClay, label: "Clay", nativeName: "IconClay" },
  { image: iconPlum, label: "Plum", nativeName: "IconPlum" },
];

export function SettingsScreen() {
  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="pb-12 pt-5"
    >
      <Stack.Screen options={{ headerLargeTitle: true, title: "Settings" }} />
      <ThemePicker />
      <AppIconPicker />
      <StorageSettings />
      <Text className="text-muted-foreground mt-10 text-center text-xs">
        bookworm 0.1.22
      </Text>
    </ScrollView>
  );
}

function ThemePicker() {
  const theme = useAppTheme();
  const border = useColor("border");
  const foreground = useColor("foreground");
  return (
    <>
      <SettingsHeading>Theme</SettingsHeading>
      <ScrollView
        horizontal
        contentContainerClassName="gap-4 px-5 py-2"
        showsHorizontalScrollIndicator={false}
      >
        {appThemes.map((item) => (
          <ThemeSwatch
            border={border}
            foreground={foreground}
            key={item.key}
            onPress={() => setAppTheme(item.key)}
            selected={item.key === theme}
            theme={item}
          />
        ))}
      </ScrollView>
    </>
  );
}

function ThemeSwatch({
  border,
  foreground,
  onPress,
  selected,
  theme,
}: {
  border: string;
  foreground: string;
  onPress: () => void;
  selected: boolean;
  theme: (typeof appThemes)[number];
}) {
  return (
    <Pressable
      accessibilityLabel={`${theme.label} theme`}
      accessibilityRole="button"
      className="items-center gap-2 active:opacity-75"
      onPress={onPress}
    >
      <View
        className="h-14 w-14 items-center justify-center rounded-full"
        style={{
          backgroundColor: theme.preview,
          borderColor: selected ? foreground : border,
          borderWidth: selected ? 3 : 1,
        }}
      >
        <ThemeCheck selected={selected} />
      </View>
      <Text className="text-muted-foreground text-xs">{theme.label}</Text>
    </Pressable>
  );
}

function ThemeCheck({ selected }: { selected: boolean }) {
  if (!selected) return null;
  return (
    <SymbolView name="checkmark" size={18} tintColor="#ffffff" weight="bold" />
  );
}

function AppIconPicker() {
  const foreground = useColor("foreground");
  const [iconName, setIconName] = useState(() => getAppIcon());
  const selectedIcon =
    iconName === "default" || iconName === "DEFAULT" ? "IconForest" : iconName;
  return (
    <>
      <SettingsHeading className="mt-8">App icon</SettingsHeading>
      <ScrollView
        horizontal
        contentContainerClassName="gap-4 px-5 py-2"
        showsHorizontalScrollIndicator={false}
      >
        {appIcons.map((item) => (
          <Pressable
            accessibilityLabel={`${item.label} app icon`}
            accessibilityRole="button"
            key={item.nativeName}
            className="items-center gap-2 active:opacity-75"
            onPress={() => changeIcon(item.nativeName, setIconName)}
          >
            <Image
              className="h-[68px] w-[68px] rounded-[16px]"
              source={item.image}
              style={{
                borderColor:
                  item.nativeName === selectedIcon ? foreground : "transparent",
                borderWidth: 3,
              }}
            />
            <Text className="text-muted-foreground text-xs">{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

function StorageSettings() {
  return (
    <>
      <SettingsHeading className="mt-8">Storage</SettingsHeading>
      <View className="border-border bg-card mx-5 rounded-2xl border px-4 py-4">
        <View className="flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className="text-foreground text-[16px] font-semibold">
              Files access
            </Text>
            <Text className="text-muted-foreground mt-1 text-sm leading-5">
              On My iPhone › bookworm › Library
            </Text>
          </View>
          <View className="bg-primary h-2.5 w-2.5 rounded-full" />
        </View>
      </View>
      <Text className="text-muted-foreground mt-3 px-6 text-sm leading-5">
        Originals and generated editions stay visible in Files. bookworm never
        overwrites an original.
      </Text>
    </>
  );
}

function SettingsHeading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      className={`text-muted-foreground mb-2 px-5 text-xs font-semibold tracking-widest uppercase ${className}`}
    >
      {children}
    </Text>
  );
}

function changeIcon(nativeName: string, setIconName: (name: string) => void) {
  if (Platform.OS !== "ios") return;
  try {
    setAppIcon(nativeName);
    setIconName(nativeName);
  } catch (error) {
    Alert.alert(
      "Couldn’t change the icon",
      error instanceof Error ? error.message : undefined,
    );
  }
}
