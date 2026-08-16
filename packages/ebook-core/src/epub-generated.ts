import type JSZip from "jszip";

import type { BookRecord, BookSection } from "./model";
import { renderEpubSection } from "./epub-content";

export interface GeneratedChapter {
  fileName: string;
  id: string;
  section: BookSection;
}

interface GenerateEpubChaptersOptions {
  archive: JSZip;
  locations: NonNullable<BookRecord["epubLocations"]>;
  packageXml: string;
  rootFile: string;
  sections: BookSection[];
}

export async function generateEpubChapters({
  archive,
  locations,
  packageXml,
  rootFile,
  sections,
}: GenerateEpubChaptersOptions) {
  const parent = rootFile.split("/").slice(0, -1).join("/");
  const chapters = new Array<GeneratedChapter>();
  for (const [index, section] of sections.entries()) {
    const id = `lib-chapter-${index + 1}`;
    const fileName = `${id}.xhtml`;
    const path = parent ? `${parent}/${fileName}` : fileName;
    const markup = await renderEpubSection(archive, section, locations);
    archive.file(path, chapterDocument(section.title, markup));
    chapters.push({ fileName, id, section: { ...section, href: path } });
  }
  return { chapters, packageXml: replaceSpine(packageXml, chapters) };
}

function chapterDocument(title: string, markup: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeXmlText(title)}</title>
    <style>body { font-family: serif; line-height: 1.55; margin: 5%; } img, svg { height: auto; max-width: 100%; }</style>
  </head>
  <body><h1>${escapeXmlText(title)}</h1>${markup}</body>
</html>`;
}

function replaceSpine(packageXml: string, chapters: GeneratedChapter[]) {
  const manifestItems = chapters
    .map(
      ({ fileName, id }) =>
        `<item id="${id}" href="${fileName}" media-type="application/xhtml+xml" />`,
    )
    .join("\n    ");
  const withManifest = packageXml.replace(
    /<\/(?:[\w.-]+:)?manifest\s*>/iu,
    `    ${manifestItems}\n  $&`,
  );
  const spineItems = chapters
    .map(({ id }) => `<itemref idref="${id}" />`)
    .join("\n    ");
  const spinePattern = /<((?:[\w.-]+:)?spine)\b([^>]*)>[\s\S]*?<\/\1\s*>/iu;
  if (!spinePattern.test(withManifest)) {
    throw new Error("This EPUB has no readable spine.");
  }
  return withManifest.replace(
    spinePattern,
    (_whole, name: string, attributes: string) =>
      `<${name}${attributes}>\n    ${spineItems}\n  </${name}>`,
  );
}

function escapeXmlText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
