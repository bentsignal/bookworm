import { useSyncExternalStore } from "react";
import { Storage } from "expo-sqlite/kv-store";
import { Uniwind } from "uniwind";

export type AppThemeKey =
  "clay" | "dark" | "forest" | "ink" | "light" | "paper" | "plum";

interface AppThemeDefinition {
  dark: Record<`--${string}`, string>;
  key: AppThemeKey;
  label: string;
  light: Record<`--${string}`, string>;
  mode?: "dark" | "light";
  preview: string;
  previewForeground: string;
}

const preferenceKey = "worm:app-theme";
const listeners = new Set<() => void>();

export const appThemes = [
  {
    key: "forest",
    label: "Forest",
    preview: "#0d4a38",
    previewForeground: "#ffffff",
    light: palette(
      "#f4f0e6",
      "#17211d",
      "#fbf8f0",
      "#e9e3d6",
      "#6e716b",
      "#d9d1c1",
      "#0d4a38",
      "#fffaf0",
      "#e64b2e",
      "#25352f",
    ),
    dark: palette(
      "#0d1713",
      "#f0eee7",
      "#16231e",
      "#22322c",
      "#a8aea9",
      "#34473f",
      "#71b49b",
      "#071510",
      "#ff7356",
      "#000000",
    ),
  },
  {
    key: "ink",
    label: "Ink",
    preview: "#294b7a",
    previewForeground: "#ffffff",
    light: palette(
      "#eef1f6",
      "#172033",
      "#f8f9fc",
      "#dfe5ee",
      "#687282",
      "#ccd4e0",
      "#294b7a",
      "#f8fbff",
      "#d9573f",
      "#1b2941",
    ),
    dark: palette(
      "#101724",
      "#f0f2f6",
      "#182234",
      "#253147",
      "#aab2c1",
      "#39465e",
      "#8eadde",
      "#09111f",
      "#ff7356",
      "#000000",
    ),
  },
  {
    key: "clay",
    label: "Clay",
    preview: "#8a493b",
    previewForeground: "#ffffff",
    light: palette(
      "#f5eee8",
      "#2d1b17",
      "#fcf7f2",
      "#eaded4",
      "#796b65",
      "#ddcbbf",
      "#8a493b",
      "#fff8f3",
      "#b9452f",
      "#3e2722",
    ),
    dark: palette(
      "#211411",
      "#f4ece7",
      "#2d1c18",
      "#3a2722",
      "#bca9a0",
      "#513730",
      "#d69280",
      "#1c0d09",
      "#ff765c",
      "#000000",
    ),
  },
  {
    key: "plum",
    label: "Plum",
    preview: "#70456f",
    previewForeground: "#ffffff",
    light: palette(
      "#f4eff3",
      "#291c29",
      "#fbf7fa",
      "#e8dde7",
      "#766a75",
      "#d8c9d6",
      "#70456f",
      "#fff8ff",
      "#c34d45",
      "#372636",
    ),
    dark: palette(
      "#1d141d",
      "#f2ebf1",
      "#291d29",
      "#382738",
      "#b7a7b5",
      "#4d394c",
      "#c391bf",
      "#160b16",
      "#ff7467",
      "#000000",
    ),
  },
  {
    key: "light",
    label: "Light",
    mode: "light",
    preview: "#f5f5f3",
    previewForeground: "#1c1c1e",
    light: neutralLightPalette(),
    dark: neutralLightPalette(),
  },
  {
    key: "dark",
    label: "Dark",
    mode: "dark",
    preview: "#171717",
    previewForeground: "#f1f1ee",
    light: neutralDarkPalette(),
    dark: neutralDarkPalette(),
  },
  {
    key: "paper",
    label: "Paper",
    mode: "light",
    preview: "#e9dec6",
    previewForeground: "#302a22",
    light: paperPalette(),
    dark: paperPalette(),
  },
] satisfies AppThemeDefinition[];

let currentTheme = parseTheme(Storage.getItemSync(preferenceKey));

export function initializeAppAppearance() {
  applyTheme(currentTheme);
}

export function useAppTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function setAppTheme(theme: AppThemeKey) {
  if (theme === currentTheme) return;
  currentTheme = theme;
  Storage.setItemSync(preferenceKey, theme);
  applyTheme(theme);
  for (const listener of listeners) listener();
}

export function resolveAppColorScheme(
  theme: AppThemeKey,
  systemScheme: "dark" | "light",
) {
  return appThemes.find((item) => item.key === theme)?.mode ?? systemScheme;
}

function applyTheme(key: AppThemeKey) {
  const theme = appThemes.find((item) => item.key === key) ?? appThemes[0];
  if (!theme) return;
  Uniwind.updateCSSVariables("light", theme.light);
  Uniwind.updateCSSVariables("dark", theme.dark);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentTheme;
}

function parseTheme(value: string | null) {
  return appThemes.find((theme) => theme.key === value)?.key ?? "forest";
}

// eslint-disable-next-line no-restricted-syntax -- Named palette calls remain less legible than the fixed semantic color order here.
function palette(
  background: string,
  foreground: string,
  card: string,
  muted: string,
  mutedForeground: string,
  border: string,
  primary: string,
  primaryForeground: string,
  accent: string,
  shadow: string,
) {
  return {
    "--accent": accent,
    "--background": background,
    "--border": border,
    "--card": card,
    "--foreground": foreground,
    "--muted": muted,
    "--muted-foreground": mutedForeground,
    "--primary": primary,
    "--primary-foreground": primaryForeground,
    "--shadow": shadow,
  };
}

function neutralLightPalette() {
  return palette(
    "#f5f5f3",
    "#1c1c1e",
    "#fffefa",
    "#e9e9e6",
    "#71716e",
    "#d7d7d2",
    "#333330",
    "#fafaf8",
    "#9a4b34",
    "#000000",
  );
}

function neutralDarkPalette() {
  return palette(
    "#151515",
    "#eeeeeb",
    "#1f1f1f",
    "#2a2a2a",
    "#a4a4a0",
    "#3b3b38",
    "#e2e2de",
    "#181818",
    "#d78668",
    "#000000",
  );
}

function paperPalette() {
  return palette(
    "#eee5d3",
    "#302a22",
    "#f6eedf",
    "#e1d5bf",
    "#746b5f",
    "#cec0a6",
    "#5f4932",
    "#fff8e9",
    "#a65239",
    "#3e3328",
  );
}
