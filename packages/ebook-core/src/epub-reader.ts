import JSZip from "jszip";

import type { BookSection, EpubLocation } from "./model";
import {
  renderEpubLocation,
  renderEpubLocations,
  renderEpubSection,
} from "./epub-content";

interface ReaderTheme {
  background: string;
  foreground: string;
  muted: string;
}

export async function buildEpubReaderHtml(
  source: Uint8Array,
  sections: BookSection[],
  theme: ReaderTheme,
  locations: EpubLocation[] = fallbackLocations(sections),
) {
  const selected = sections.filter((section) => section.included);
  if (selected.length === 0) {
    throw new Error("Include at least one chapter before reading.");
  }
  const archive = await JSZip.loadAsync(source);
  const chapters = new Array<string>();
  for (const section of selected) {
    const markup = await renderEpubSection(archive, section, locations);
    chapters.push(chapterMarkup(section.title, markup));
  }
  return readerDocument(chapters.join("\n"), theme);
}

export async function buildEpubSectionHtml(
  source: Uint8Array,
  section: BookSection,
  locations: EpubLocation[],
  theme: ReaderTheme,
) {
  const archive = await JSZip.loadAsync(source);
  const markup = await renderEpubSection(archive, section, locations);
  return readerDocument(chapterMarkup(section.title, markup), theme);
}

export async function buildEpubLocationHtml(
  source: Uint8Array,
  location: EpubLocation,
  theme: ReaderTheme,
) {
  const archive = await JSZip.loadAsync(source);
  const markup = await renderEpubLocation(archive, location);
  return readerDocument(markup, theme);
}

export async function buildEpubBoundaryHtml(
  source: Uint8Array,
  locations: EpubLocation[],
  selectedIndex: number,
  theme: ReaderTheme,
) {
  const archive = await JSZip.loadAsync(source);
  const markup = await renderEpubLocations(archive, locations);
  const blocks = markup.map((content, index) => {
    const location = locations[index];
    if (!location) return "";
    const selected = index === selectedIndex ? " selected" : "";
    return `<section class="bookworm-boundary${selected}" data-location="${index + 1}">${content}</section>`;
  });
  return readerDocument(blocks.join("\n"), theme);
}

function readerDocument(markup: string, theme: ReaderTheme) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:" />
    <style>${readerCss(theme)}</style>
  </head>
  <body>${markup}</body>
</html>`;
}

function chapterMarkup(title: string, markup: string) {
  return `<article><h1 class="worm-chapter-title">${escapeHtml(title)}</h1>${markup}</article>`;
}

function fallbackLocations(sections: BookSection[]) {
  return sections.flatMap((section) =>
    section.href
      ? [
          {
            excerpt: "",
            href: section.href,
            index: 0,
            title: section.title,
          },
        ]
      : [],
  );
}

function readerCss(theme: ReaderTheme) {
  return `
:root { color-scheme: light dark; }
html { background: ${theme.background}; }
body {
  -webkit-overflow-scrolling: touch;
  background: ${theme.background};
  color: ${theme.foreground};
  font-family: ui-serif, Georgia, serif;
  font-size: 19px;
  line-height: 1.65;
  margin: 0 auto;
  max-width: 44rem;
  padding: 2rem 1.35rem 7rem;
  overflow-wrap: anywhere;
}
article + article { border-top: 1px solid ${theme.muted}; margin-top: 4rem; padding-top: 3rem; }
.worm-chapter-title { font-size: 1.7em; line-height: 1.15; margin: 0 0 1.6em; }
h1, h2, h3, h4 { line-height: 1.2; }
p { margin: 0 0 1.1em; }
img, svg { height: auto; max-width: 100%; }
a { color: inherit; text-decoration-color: ${theme.muted}; }
table { border-collapse: collapse; display: block; max-width: 100%; overflow-x: auto; }
.bookworm-boundary { border-left: 3px solid transparent; margin: 0 -0.75rem; padding: 0.5rem 0.75rem; }
.bookworm-boundary.selected { background: color-mix(in srgb, ${theme.muted} 24%, transparent); border-left-color: ${theme.foreground}; border-radius: 0.35rem; }
`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
