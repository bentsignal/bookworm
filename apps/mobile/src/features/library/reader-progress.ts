import type { BookSection } from "@worm/ebook-core";

interface SavedEpubPosition {
  scrollProgress: number;
  sectionId: string | null;
  sectionIndex: number;
}

export function resolveEpubPosition(
  sections: BookSection[],
  saved: SavedEpubPosition | undefined,
) {
  const matchingIndex = sections.findIndex(
    (section) => section.id === saved?.sectionId,
  );
  const fallbackIndex = saved?.sectionIndex ?? 0;
  return {
    scrollProgress: clamp(saved?.scrollProgress ?? 0, 0, 1),
    sectionIndex: clamp(
      matchingIndex >= 0 ? matchingIndex : fallbackIndex,
      0,
      Math.max(0, sections.length - 1),
    ),
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
