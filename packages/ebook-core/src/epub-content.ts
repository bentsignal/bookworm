import type JSZip from "jszip";

import type { BookSection, EpubLocation } from "./model";

export interface EpubNavigationPoint {
  href: string;
  title: string;
}

interface DocumentBoundary {
  fragment?: string;
  start: number;
  title?: string;
}

export async function discoverEpubLocations(
  archive: JSZip,
  spineHrefs: string[],
  navigation: EpubNavigationPoint[] = [],
) {
  const locations = new Array<EpubLocation>();
  for (const href of spineHrefs) {
    const source = await archive.file(href)?.async("string");
    if (!source) continue;
    const points = navigation.filter((point) => sameDocument(point.href, href));
    const segments = splitDocument(source, points);
    segments.forEach((segment, index) => {
      locations.push({
        href,
        index,
        title: segment.title ?? `Location ${locations.length + 1}`,
        excerpt: excerptFromMarkup(segment.markup),
        fragment: segment.fragment,
        startOffset: segment.startOffset,
        endOffset: segment.endOffset,
      });
    });
  }
  return locations;
}

export async function renderEpubSection(
  archive: JSZip,
  section: BookSection,
  locations: EpubLocation[],
) {
  const range = sectionLocationRange(section, locations);
  const selected = locations.slice(range.start, range.end + 1);
  const rendered = new Array<string>();
  for (const location of selected) {
    const source = await archive.file(location.href)?.async("string");
    if (!source) continue;
    const markup = locationMarkup(source, location);
    if (!markup) continue;
    rendered.push(await embedImages(archive, location.href, markup));
  }
  return rendered.join("\n");
}

export async function renderEpubLocation(
  archive: JSZip,
  location: EpubLocation,
) {
  const source = await archive.file(location.href)?.async("string");
  if (!source) throw new Error("This EPUB location is missing its content.");
  const markup = locationMarkup(source, location);
  if (!markup) throw new Error("This EPUB location could not be found.");
  return embedImages(archive, location.href, markup);
}

export function sectionLocationRange(
  section: BookSection,
  locations: EpubLocation[],
) {
  if (locations.length === 0) return { start: 0, end: 0 };
  const fallback = Math.max(
    0,
    locations.findIndex((location) =>
      sameDocument(location.href, section.href),
    ),
  );
  const fallbackEnd = locations.reduce(
    (last, location, index) =>
      sameDocument(location.href, section.href) ? index : last,
    fallback,
  );
  const start = clamp(
    section.startLocation ?? fallback,
    0,
    locations.length - 1,
  );
  const end = clamp(
    section.endLocation ?? fallbackEnd,
    start,
    locations.length - 1,
  );
  return { start, end };
}

function splitDocument(source: string, navigation: EpubNavigationPoint[] = []) {
  const body = extractBody(stripUnsafeMarkup(source));
  const boundaries = documentBoundaries(body, navigation);
  if (boundaries.length === 0) {
    return [
      {
        markup: body,
        start: 0,
        title: undefined,
        startOffset: 0,
        endOffset: body.length,
      },
    ];
  }
  if (hasMeaningfulContent(body.slice(0, boundaries[0]?.start))) {
    boundaries.unshift({ start: 0, title: undefined });
  }
  return boundaries.map((boundary, index) => {
    const end = boundaries[index + 1]?.start ?? body.length;
    return {
      ...boundary,
      markup: body.slice(boundary.start, end),
      startOffset: boundary.start,
      endOffset: end,
    };
  });
}

function documentBoundaries(body: string, navigation: EpubNavigationPoint[]) {
  const headings = [
    ...body.matchAll(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1\s*>/giu),
  ];
  const boundaryDetails = new Array<DocumentBoundary>(
    ...headings.map((heading) => ({
      start: heading.index,
      title: heading[2] ? textFromMarkup(heading[2]) : undefined,
    })),
  );
  for (const point of navigation) {
    const fragment = fragmentFromHref(point.href);
    const start = fragment ? fragmentOffset(body, fragment) : 0;
    if (start < 0) continue;
    boundaryDetails.push({ start, title: point.title, fragment });
  }
  const byStart = new Map<number, DocumentBoundary>();
  for (const detail of boundaryDetails) {
    const current = byStart.get(detail.start);
    byStart.set(detail.start, {
      ...current,
      ...detail,
      title: detail.title ?? current?.title,
      fragment: detail.fragment ?? current?.fragment,
    });
  }
  return [...byStart.values()].sort((a, b) => a.start - b.start);
}

function locationMarkup(source: string, location: EpubLocation) {
  const body = extractBody(stripUnsafeMarkup(source));
  if (location.startOffset !== undefined && location.endOffset !== undefined) {
    return body.slice(location.startOffset, location.endOffset);
  }
  return splitDocument(source)[location.index]?.markup;
}

function fragmentFromHref(href: string) {
  const fragment = href.split("#")[1];
  return fragment ? decodeURIComponent(fragment) : undefined;
}

function fragmentOffset(body: string, fragment: string) {
  const escaped = escapeRegExp(fragment);
  const pattern = new RegExp(
    `<[^>]*\\b(?:id|name)\\s*=\\s*["']${escaped}["'][^>]*>`,
    "iu",
  );
  return pattern.exec(body)?.index ?? -1;
}

function escapeRegExp(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
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
  let result = markup;
  for (const match of markup.matchAll(pattern)) {
    const [whole, prefix, href, quote] = match;
    if (!whole || !prefix || !href || !quote || !isLocalAsset(href)) continue;
    const assetPath = normalizeHref(chapterPath, href);
    const asset = archive.file(assetPath);
    if (!asset) continue;
    const base64 = await asset.async("base64");
    result = result.replace(
      whole,
      `${prefix}data:${imageMediaType(assetPath)};base64,${base64}${quote}`,
    );
  }
  return result;
}

function hasMeaningfulContent(markup: string | undefined) {
  if (!markup) return false;
  return (
    /<(?:img|image)\b/iu.test(markup) || textFromMarkup(markup).length > 20
  );
}

function excerptFromMarkup(markup: string) {
  const text = textFromMarkup(markup);
  return text.length > 180 ? `${text.slice(0, 177).trim()}…` : text;
}

function textFromMarkup(markup: string) {
  return decodeXmlEntities(
    markup
      .replaceAll(/<[^>]+>/gu, " ")
      .replaceAll(/\s+/gu, " ")
      .trim(),
  );
}

function decodeXmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&apos;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&quot;", '"')
    .replaceAll(/&#(\d+);/gu, (_entity, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10)),
    )
    .replaceAll(/&#x([\da-f]+);/giu, (_entity, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    );
}

function sameDocument(first: string, second: string | undefined) {
  return stripUrlSuffix(first) === stripUrlSuffix(second ?? "");
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
