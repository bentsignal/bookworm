import JSZip from "jszip";

import type { BookSection } from "./model";

interface PdfEpubEdition {
  author?: string;
  identifier: string;
  modifiedAt: string;
  sections: BookSection[];
  title: string;
}

interface EditionCover {
  bytes: Uint8Array;
  extension: string;
}

export async function buildEpubFromPdf(
  pageTexts: string[],
  edition: PdfEpubEdition,
  cover?: EditionCover,
) {
  const chapters = edition.sections
    .filter((section) => section.included)
    .map((section, index) => createChapter(section, index, pageTexts));
  if (chapters.length === 0) {
    throw new Error("Include at least one page range before converting.");
  }
  if (!chapters.some((chapter) => chapter.hasText)) {
    throw new Error(
      "This PDF has no readable text. lib can convert text-based PDFs; scanned pages will need OCR support.",
    );
  }

  const archive = new JSZip();
  archive.file("mimetype", "application/epub+zip", { compression: "STORE" });
  archive.file("META-INF/container.xml", containerXml());
  archive.file("EPUB/styles.css", readerStyles());
  archive.file("EPUB/nav.xhtml", navigationDocument(edition.title, chapters));
  archive.file("EPUB/package.opf", packageDocument(edition, chapters, cover));
  if (cover)
    archive.file(`EPUB/cover.${safeExtension(cover.extension)}`, cover.bytes);
  for (const chapter of chapters) {
    archive.file(`EPUB/${chapter.fileName}`, chapter.document);
  }
  return archive.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

function createChapter(
  section: BookSection,
  index: number,
  pageTexts: string[],
) {
  const start = Math.max(1, section.startPage ?? 1);
  const end = Math.min(pageTexts.length, section.endPage ?? pageTexts.length);
  const pages = pageTexts.slice(start - 1, end);
  const body = pages
    .map((text, offset) => pageMarkup(text, start + offset))
    .join("\n");
  const fileName = `chapter-${index + 1}.xhtml`;
  return {
    document: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeXml(section.title)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css" />
  </head>
  <body>
    <section>
      <h1>${escapeXml(section.title)}</h1>
      ${body}
    </section>
  </body>
</html>`,
    fileName,
    hasText: pages.some((text) => text.trim().length > 0),
    id: `chapter-${index + 1}`,
    title: section.title,
  };
}

function pageMarkup(text: string, pageNumber: number) {
  const paragraphs = textToParagraphs(text);
  const contents =
    paragraphs.length === 0
      ? '<p class="empty-page">No readable text on this page.</p>'
      : paragraphs
          .map((paragraph) => `<p>${escapeXml(paragraph)}</p>`)
          .join("\n");
  return `<section class="pdf-page" aria-label="PDF page ${pageNumber}">
  <span class="page-number">${pageNumber}</span>
  ${contents}
</section>`;
}

function textToParagraphs(text: string) {
  return text
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split(/\n\s*\n/gu)
    .map((block) => joinWrappedLines(block))
    .filter(Boolean);
}

function joinWrappedLines(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.reduce((paragraph, line) => {
    if (!paragraph) return line;
    if (paragraph.endsWith("-") && /^\p{Ll}/u.test(line)) {
      return `${paragraph.slice(0, -1)}${line}`;
    }
    return `${paragraph} ${line}`;
  }, "");
}

function containerXml() {
  return `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>`;
}

function packageDocument(
  edition: PdfEpubEdition,
  chapters: ReturnType<typeof createChapter>[],
  cover: EditionCover | undefined,
) {
  const author = edition.author?.trim();
  const modifiedAt = new Date(edition.modifiedAt)
    .toISOString()
    .replace(/\.\d{3}Z$/u, "Z");
  const manifest = chapters
    .map(
      (chapter) =>
        `<item id="${chapter.id}" href="${chapter.fileName}" media-type="application/xhtml+xml" />`,
    )
    .join("\n    ");
  const spine = chapters
    .map((chapter) => `<itemref idref="${chapter.id}" />`)
    .join("\n    ");
  const coverItem = cover
    ? `<item id="cover" href="cover.${safeExtension(cover.extension)}" media-type="${imageMediaType(cover.extension)}" properties="cover-image" />`
    : "";
  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" unique-identifier="book-id" version="3.0">
  <metadata>
    <dc:identifier id="book-id">urn:lib:${escapeXml(edition.identifier)}</dc:identifier>
    <dc:title>${escapeXml(edition.title)}</dc:title>
    ${author ? `<dc:creator>${escapeXml(author)}</dc:creator>` : ""}
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${modifiedAt}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
    <item id="styles" href="styles.css" media-type="text/css" />
    ${coverItem}
    ${manifest}
  </manifest>
  <spine>
    ${spine}
  </spine>
</package>`;
}

function safeExtension(extension: string) {
  const safe = extension.replaceAll(/[^a-z0-9]/giu, "").toLowerCase();
  return safe || "jpg";
}

function imageMediaType(extension: string) {
  const normalized = safeExtension(extension);
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  if (normalized === "gif") return "image/gif";
  return "image/jpeg";
}

function navigationDocument(
  title: string,
  chapters: ReturnType<typeof createChapter>[],
) {
  const items = chapters
    .map(
      (chapter) =>
        `<li><a href="${chapter.fileName}">${escapeXml(chapter.title)}</a></li>`,
    )
    .join("\n        ");
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
  <head><title>${escapeXml(title)}</title></head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>${escapeXml(title)}</h1>
      <ol>
        ${items}
      </ol>
    </nav>
  </body>
</html>`;
}

function readerStyles() {
  return `body { font-family: serif; line-height: 1.55; margin: 5%; }
h1 { break-after: avoid; font-size: 1.65em; }
.pdf-page + .pdf-page { break-before: page; }
.page-number { color: #777; display: block; font: 0.7em sans-serif; margin-bottom: 1.25em; }
.empty-page { color: #777; font-style: italic; }`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
