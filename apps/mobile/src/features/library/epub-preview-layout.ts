const baseLineHeight = 28;
const horizontalPadding = 32;
const verticalPadding = 20;
const maximumLines = 6;
const maximumFontScale = 1.4;

export function epubPreviewLayout(
  text: string,
  rowWidth: number,
  fontScale: number,
) {
  const scale = Math.min(Math.max(fontScale, 1), maximumFontScale);
  const textWidth = Math.max(1, rowWidth - horizontalPadding);
  const charactersPerLine = Math.max(12, Math.floor(textWidth / (9 * scale)));
  const lineCount = Math.min(
    maximumLines,
    wrappedLineCount(text, charactersPerLine),
  );
  return {
    height: Math.ceil(lineCount * baseLineHeight * scale + verticalPadding),
    lineCount,
  };
}

function wrappedLineCount(text: string, charactersPerLine: number) {
  const words = text.trim().split(/\s+/u);
  if (words.length === 0 || !words[0]) return 1;
  let lines = 0;
  let used = 0;
  for (const word of words) {
    if (used + word.length + 1 <= charactersPerLine) {
      used += used === 0 ? word.length : word.length + 1;
      continue;
    }
    if (used > 0) lines += 1;
    let remaining = word.length;
    while (remaining > charactersPerLine) {
      lines += 1;
      remaining -= charactersPerLine;
    }
    used = remaining;
  }
  return Math.max(1, lines + (used > 0 ? 1 : 0));
}
