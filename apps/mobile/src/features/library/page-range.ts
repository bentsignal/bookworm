export function parsePageRange(value: string | undefined, pageCount: number) {
  const match = value?.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/u);
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (start < 1 || end < start || end > pageCount) return undefined;
  return { start, end };
}
