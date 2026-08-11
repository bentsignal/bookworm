import { DarkTheme, DefaultTheme } from "expo-router";

export function createNavigationTheme(
  colorScheme: "dark" | "light",
  colors: {
    background: string;
    border: string;
    foreground: string;
    primary: string;
  },
) {
  const base = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      border: colors.border,
      card: colors.background,
      primary: colors.primary,
      text: colors.foreground,
    },
  };
}
