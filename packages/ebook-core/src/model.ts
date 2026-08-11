export type BookFormat = "epub" | "pdf";

export interface BookSection {
  id: string;
  title: string;
  included: boolean;
  href?: string;
  startPage?: number;
  endPage?: number;
}

export interface BookAnalysis {
  title: string;
  author?: string;
  format: BookFormat;
  pageCount?: number;
  sections: BookSection[];
}

export interface BookRecord extends BookAnalysis {
  id: string;
  sourceFileName: string;
  sourceUri: string;
  importedAt: string;
  modifiedAt: string;
  fileSize?: number;
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

export function moveSection(
  sections: BookSection[],
  sectionId: string,
  direction: -1 | 1,
) {
  const currentIndex = sections.findIndex(
    (section) => section.id === sectionId,
  );
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sections.length) {
    return sections;
  }
  const next = [...sections];
  const [section] = next.splice(currentIndex, 1);
  if (!section) return sections;
  next.splice(targetIndex, 0, section);
  return next;
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
