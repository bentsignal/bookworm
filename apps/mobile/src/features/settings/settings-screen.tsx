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

import type { AppThemeKey } from "~/features/theme/app-appearance";
import {
  appThemes,
  setAppTheme,
  useAppTheme,
} from "~/features/theme/app-appearance";
import { useColor } from "~/hooks/use-color";
import iconClay from "../../../assets/icons/sources/clay-light.png";
import iconForest from "../../../assets/icons/sources/forest-light.png";
import iconInk from "../../../assets/icons/sources/ink-light.png";
import iconPaper from "../../../assets/icons/sources/paper-light.png";
import iconPlum from "../../../assets/icons/sources/plum-light.png";

const appIcons = [
  { image: iconPaper, label: "Paper", nativeName: "IconPaper" },
  { image: iconForest, label: "Forest", nativeName: "IconForest" },
  { image: iconInk, label: "Ink", nativeName: "IconInk" },
  { image: iconClay, label: "Clay", nativeName: "IconClay" },
  { image: iconPlum, label: "Plum", nativeName: "IconPlum" },
] as const;

const themeRank = {
  paper: 0,
  forest: 1,
  ink: 2,
  clay: 3,
  plum: 4,
  light: 5,
  dark: 6,
} satisfies Record<AppThemeKey, number>;
const themeOptions = [...appThemes].sort(
  (left, right) => themeRank[left.key] - themeRank[right.key],
);

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
        lib 0.1.31
      </Text>
    </ScrollView>
  );
}

function AppIconPicker() {
  const border = useColor("border");
  const foreground = useColor("foreground");
  const [iconName, setIconName] = useState(() =>
    Platform.OS === "ios" ? getAppIcon() : "default",
  );
  const selectedIcon = iconName === "default" ? "IconPaper" : iconName;

  if (Platform.OS !== "ios") return null;

  return (
    <>
      <SettingsHeading className="mt-8">App icon</SettingsHeading>
      <ScrollView
        horizontal
        contentContainerClassName="gap-4 px-5 py-2"
        showsHorizontalScrollIndicator={false}
      >
        {appIcons.map((item) => {
          const selected = item.nativeName === selectedIcon;
          return (
            <Pressable
              accessibilityLabel={`${item.label} app icon`}
              accessibilityRole="button"
              className="items-center gap-2 active:opacity-75"
              key={item.nativeName}
              onPress={() => changeIcon(item.nativeName, setIconName)}
            >
              <Image
                className="h-[68px] w-[68px] rounded-[16px]"
                source={item.image}
                style={{
                  borderColor: selected ? foreground : border,
                  borderWidth: selected ? 3 : 1,
                }}
              />
              <Text className="text-muted-foreground text-xs">
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text className="text-muted-foreground mt-2 px-6 text-sm leading-5">
        Every icon follows the Home Screen’s light, dark, and tinted appearance.
      </Text>
    </>
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
        {themeOptions.map((item) => (
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
        <ThemeCheck color={theme.previewForeground} selected={selected} />
      </View>
      <Text className="text-muted-foreground text-xs">{theme.label}</Text>
    </Pressable>
  );
}

function ThemeCheck({ color, selected }: { color: string; selected: boolean }) {
  if (!selected) return null;
  return (
    <SymbolView name="checkmark" size={18} tintColor={color} weight="bold" />
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
              On My iPhone › lib › Library
            </Text>
          </View>
          <View className="bg-primary h-2.5 w-2.5 rounded-full" />
        </View>
      </View>
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
