import JSZip from "jszip";

import type { BookSection } from "./model";

interface ReaderTheme {
  background: string;
  foreground: string;
  muted: string;
}

export async function buildEpubReaderHtml(
  source: Uint8Array,
  sections: BookSection[],
  theme: ReaderTheme,
) {
  const selected = sections.filter((section) => section.included);
  if (selected.length === 0) {
    throw new Error("Include at least one chapter before reading.");
  }
  const archive = await JSZip.loadAsync(source);
  const chapters = await Promise.all(
    selected.map((section) => renderChapter(archive, section)),
  );
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:" />
    <style>${readerCss(theme)}</style>
  </head>
  <body>${chapters.join("\n")}</body>
</html>`;
}

async function renderChapter(archive: JSZip, section: BookSection) {
  if (!section.href) {
    return `<article><h1>${escapeHtml(section.title)}</h1><p>Chapter content is unavailable.</p></article>`;
  }
  const chapterPath = stripUrlSuffix(section.href);
  const source = await archive.file(chapterPath)?.async("string");
  if (!source) {
    return `<article><h1>${escapeHtml(section.title)}</h1><p>Chapter content is unavailable.</p></article>`;
  }
  const body = extractBody(stripUnsafeMarkup(source));
  const withImages = await embedImages(archive, chapterPath, body);
  return `<article><h1 class="worm-chapter-title">${escapeHtml(section.title)}</h1>${withImages}</article>`;
}

function stripUnsafeMarkup(source: string) {
  return source
    .replaceAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/giu, "")
    .replaceAll(
      /<(?:iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/(?:iframe|object|embed|form)\s*>/giu,
      "",
    )
    .replaceAll(/<(?:iframe|object|embed|form)\b[^>]*\/?>/giu, "")
    .replaceAll(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/giu, "")
    .replaceAll(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*\/?>/giu, "");
}

function extractBody(source: string) {
  const match = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/iu.exec(source);
  if (match?.[1]) return match[1];
  return source
    .replace(/<\?xml[^>]*>/iu, "")
    .replace(/<!doctype[^>]*>/iu, "")
    .replaceAll(/<\/?(?:html|head)\b[^>]*>/giu, "");
}

async function embedImages(
  archive: JSZip,
  chapterPath: string,
  markup: string,
) {
  const pattern =
    /(<(?:img|image)\b[^>]*?\s(?:src|href|xlink:href)\s*=\s*["'])([^"']+)(["'])/giu;
  const matches = [...markup.matchAll(pattern)];
  let result = markup;
  for (const match of matches) {
    const whole = match[0];
    const prefix = match[1];
    const href = match[2];
    const quote = match[3];
    if (!whole || !prefix || !href || !quote || !isLocalAsset(href)) continue;
    const assetPath = normalizeHref(chapterPath, href);
    const asset = archive.file(assetPath);
    if (!asset) continue;
    const base64 = await asset.async("base64");
    const embedded = `${prefix}data:${imageMediaType(assetPath)};base64,${base64}${quote}`;
    result = result.replace(whole, embedded);
  }
  return result;
}

function isLocalAsset(href: string) {
  return !/^(?:data:|https?:|#)/iu.test(href);
}

function normalizeHref(parentFile: string, href: string) {
  const base = stripUrlSuffix(parentFile).split("/").slice(0, -1);
  const parts = [
    ...base,
    ...decodeURIComponent(stripUrlSuffix(href)).split("/"),
  ];
  const normalized = new Array<string>();
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  return normalized.join("/");
}

function stripUrlSuffix(value: string) {
  return value.split(/[?#]/u)[0] ?? value;
}

function imageMediaType(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "webp") return "image/webp";
  return "image/png";
}

function readerCss(theme: ReaderTheme) {
  return `
:root { color-scheme: light dark; }
html { background: ${theme.background}; }
body {
  background: ${theme.background};
  color: ${theme.foreground};
  font-family: ui-serif, Georgia, serif;
  font-size: 19px;
  line-height: 1.65;
  margin: 0 auto;
  max-width: 44rem;
  padding: 2rem 1.35rem 6rem;
  overflow-wrap: anywhere;
}
article + article { border-top: 1px solid ${theme.muted}; margin-top: 4rem; padding-top: 3rem; }
.worm-chapter-title { font-size: 1.7em; line-height: 1.15; margin: 0 0 1.6em; }
h1, h2, h3, h4 { line-height: 1.2; }
p { margin: 0 0 1.1em; }
img, svg { height: auto; max-width: 100%; }
a { color: inherit; text-decoration-color: ${theme.muted}; }
table { border-collapse: collapse; display: block; max-width: 100%; overflow-x: auto; }
`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
