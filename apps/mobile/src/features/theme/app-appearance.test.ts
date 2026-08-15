import { describe, expect, it, vi } from "vitest";

vi.mock("expo-sqlite/kv-store", () => ({
  Storage: { getItemSync: vi.fn(), setItemSync: vi.fn() },
}));
vi.mock("react-native", () => ({
  Appearance: { setColorScheme: vi.fn() },
  useColorScheme: vi.fn(() => "light"),
}));
vi.mock("uniwind", () => ({
  Uniwind: { updateCSSVariables: vi.fn() },
}));

describe("app theme contrast", () => {
  it("keeps reading and secondary text comfortable and accessible", async () => {
    const { appThemes } = await import("./app-appearance");
    for (const theme of appThemes) {
      for (const mode of ["light", "dark"] as const) {
        const colors = theme[mode];
        const surfaces = [
          colors["--background"],
          colors["--card"],
          colors["--muted"],
        ];
        expect(
          Math.min(
            ...surfaces.map((surface) =>
              contrastRatio(surface, colors["--foreground"]),
            ),
          ),
        ).toBeGreaterThanOrEqual(7);
        expect(
          Math.min(
            ...surfaces.map((surface) =>
              contrastRatio(surface, colors["--muted-foreground"]),
            ),
          ),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(colors["--primary"], colors["--primary-foreground"]),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps Night Paper dimmer than Paper with dark-on-light text", async () => {
    const { appThemes } = await import("./app-appearance");
    const nightPaper = appThemes.find((theme) => theme.key === "nightPaper");
    const paper = appThemes.find((theme) => theme.key === "paper");
    expect(nightPaper).toBeDefined();
    expect(paper).toBeDefined();
    if (!nightPaper || !paper) return;

    const background = nightPaper.light["--background"];
    const foreground = nightPaper.light["--foreground"];
    expect(relativeLuminance(background)).toBeGreaterThan(
      relativeLuminance(foreground),
    );
    expect(relativeLuminance(background)).toBeLessThan(
      relativeLuminance(paper.light["--background"]) * 0.5,
    );
    expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(background, foreground)).toBeLessThan(8);
  });
});

function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

function relativeLuminance(color: string) {
  const channels = color
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  const [red, green, blue] = channels ?? [];
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`Invalid ${color}`);
  }
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}
