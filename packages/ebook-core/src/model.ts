export type BookFormat = "epub" | "pdf";

export const EPUB_STRUCTURE_VERSION = 3;

export interface EpubLocation {
  href: string;
  index: number;
  title: string;
  excerpt: string;
  fragment?: string;
  startOffset?: number;
  endOffset?: number;
}

export interface BookSection {
  id: string;
  title: string;
  included: boolean;
  href?: string;
  startPage?: number;
  endPage?: number;
  startLocation?: number;
  endLocation?: number;
}

export interface BookAnalysis {
  title: string;
  author?: string;
  format: BookFormat;
  pageCount?: number;
  epubLocations?: EpubLocation[];
  epubStructureVersion?: number;
  sections: BookSection[];
}

export interface BookRecord extends BookAnalysis {
  id: string;
  sourceFileName: string;
  coverFileName?: string;
  importedAt: string;
  modifiedAt: string;
  fileSize?: number;
  convertedEpubUri?: string;
  exportedUri?: string;
}

export function getBookFormat(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "epub" || extension === "pdf") return extension;
  return undefined;
}

export function titleFromFileName(fileName: string) {
  const withoutExtension = fileName.replace(/\.(epub|pdf)$/iu, "");
  const normalized = withoutExtension.replaceAll(/[_-]+/gu, " ").trim();
  if (!normalized) return "Untitled book";
  return normalized.replaceAll(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export function reorderSections(
  sections: BookSection[],
  sourceIndices: number[],
  destination: number,
) {
  const selected = new Set(sourceIndices);
  const moved = sections.filter((_, index) => selected.has(index));
  if (moved.length === 0) return sections;

  const remaining = sections.filter((_, index) => !selected.has(index));
  const removedBeforeDestination = sourceIndices.filter(
    (index) => index < destination,
  ).length;
  const insertionIndex = Math.max(
    0,
    Math.min(destination - removedBeforeDestination, remaining.length),
  );
  remaining.splice(insertionIndex, 0, ...moved);
  return remaining;
}

export function removeSections(sections: BookSection[], indices: number[]) {
  const removed = new Set(indices);
  return sections.filter((_, index) => !removed.has(index));
}

export function getIncludedPageIndexes(
  sections: BookSection[],
  pageCount: number,
) {
  const indexes = new Array<number>();
  for (const section of sections) {
    if (!section.included) continue;
    if (section.startPage === undefined || section.endPage === undefined)
      continue;
    const first = Math.max(1, section.startPage);
    const last = Math.min(pageCount, section.endPage);
    for (let page = first; page <= last; page += 1) indexes.push(page - 1);
  }
  return indexes;
}

export function createEditionFileName(title: string, format: BookFormat) {
  const safeTitle = title
    .normalize("NFKD")
    .replaceAll(/[^\p{L}\p{N}]+/gu, "-")
    .replaceAll(/^-|-$/gu, "")
    .toLowerCase();
  return `${safeTitle || "untitled"}-worm-edition.${format}`;
}
