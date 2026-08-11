import { useCSSVariable } from "uniwind";

export function useColor(color: string) {
  const value = useCSSVariable(`--${color}`);
  if (typeof value !== "string") throw new Error(`Missing color: ${color}`);
  return value;
}
