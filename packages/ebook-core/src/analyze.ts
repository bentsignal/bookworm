import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

import type { EpubNavigationPoint } from "./epub-content";
import type { BookAnalysis } from "./model";
import { discoverEpubLocations } from "./epub-content";
import { textFromMarkup } from "./epub-text";
import {
  EPUB_STRUCTURE_VERSION,
  getBookFormat,
  titleFromFileName,
} from "./model";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

export async function analyzeBook(bytes: Uint8Array, fileName: string) {
  const format = getBookFormat(fileName);
  if (!format) throw new Error("lib supports EPUB and PDF files.");
  if (format === "pdf") return analyzePdf(bytes, fileName);
  const archive = await JSZip.loadAsync(bytes);
  return analyzeEpubArchive(archive, fileName);
}

async function analyzePdf(bytes: Uint8Array, fileName: string) {
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  const pageCount = document.getPageCount();
  return {
    title: nonBlank(document.getTitle(), titleFromFileName(fileName)),
    author: optionalNonBlank(document.getAuthor()),
    format: "pdf",
    pageCount,
    sections: [
      {
        id: "section-1",
        title: "Complete book",
        included: true,
        startPage: 1,
        endPage: pageCount,
      },
    ],
  } satisfies BookAnalysis;
}

export async function analyzeEpubArchive(archive: JSZip, fileName: string) {
  const rootFile = await getRootFile(archive);
  const packageXml = await archive.file(rootFile)?.async("string");
  if (!packageXml) throw new Error("This EPUB has no readable package file.");
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The parser has no schema-aware generic; this boundary is validated as the EPUB is read.
  const parsed = xmlParser.parse(packageXml) as ParsedPackage;
  const packageData = parsed.package;
  const title = nonBlank(
    readText(packageData.metadata?.title),
    titleFromFileName(fileName),
  );
  const author = optionalNonBlank(readText(packageData.metadata?.creator));
  const manifestItems = toArray(packageData.manifest?.item);
  const spineItems = toArray(packageData.spine?.itemref);
  const hrefById = new Map(
    manifestItems.map((item) => [item["@_id"], item["@_href"]]),
  );
  const navigation = await readNavigationPoints(
    archive,
    rootFile,
    manifestItems,
  );
  const spineSections = spineItems.flatMap((item, index) => {
    const href = hrefById.get(item["@_idref"]);
    if (!href) return [];
    const normalizedHref = normalizeHref(rootFile, href);
    return [
      {
        id: `section-${index + 1}`,
        title:
          navigation.find((point) => sameDocument(point.href, normalizedHref))
            ?.title ?? `Section ${index + 1}`,
        included: true,
        href: normalizedHref,
      },
    ];
  });
  const spineHrefs = spineSections.flatMap((section) =>
    section.href ? [section.href] : [],
  );
  const epubLocations = await discoverEpubLocations(
    archive,
    spineHrefs,
    navigation,
  );
  const sections = sectionsFromNavigation(navigation, epubLocations);
  return {
    title,
    author,
    format: "epub",
    epubLocations,
    epubStructureVersion: EPUB_STRUCTURE_VERSION,
    sections:
      sections.length > 0
        ? sections
        : spineSections.length > 0
          ? spineSections
          : fallbackEpubSection(),
  } satisfies BookAnalysis;
}

function sectionsFromNavigation(
  navigation: EpubNavigationPoint[],
  locations: BookAnalysis["epubLocations"],
) {
  if (!locations) return [];
  const starts = navigation.flatMap((point) => {
    const fragment = fragmentFromHref(point.href);
    const start = locations.findIndex(
      (location) =>
        sameDocument(location.href, point.href) &&
        (!fragment || location.fragment === fragment),
    );
    return start < 0 ? [] : [{ point, start }];
  });
  const unique = [
    ...new Map(starts.map((entry) => [entry.start, entry])).values(),
  ].sort((first, second) => first.start - second.start);
  return unique.map(({ point, start }, index) => ({
    id: `section-${index + 1}`,
    title: point.title,
    included: true,
    href: locations[start]?.href,
    startLocation: start,
    endLocation: (unique[index + 1]?.start ?? locations.length) - 1,
  }));
}

async function getRootFile(archive: JSZip) {
  const containerXml = await archive
    .file("META-INF/container.xml")
    ?.async("string");
  if (!containerXml) throw new Error("This EPUB is missing its container.");
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The parser has no schema-aware generic; required fields are checked below.
  const parsed = xmlParser.parse(containerXml) as ParsedContainer;
  const rootFile = toArray(parsed.container?.rootfiles?.rootfile)[0];
  const path = rootFile?.["@_full-path"];
  if (!path) throw new Error("This EPUB does not identify its package file.");
  return path;
}

async function readNavigationPoints(
  archive: JSZip,
  rootFile: string,
  manifestItems: ManifestItem[],
) {
  const points = new Array<EpubNavigationPoint>();
  const navigationItem = manifestItems.find((item) => isNavigationItem(item));
  if (!navigationItem) return points;
  const navPath = normalizeHref(rootFile, navigationItem["@_href"]);
  const navigation = await archive.file(navPath)?.async("string");
  if (!navigation) return points;
  if (navigationItem["@_media-type"] === "application/x-dtbncx+xml") {
    return readNcxPoints(navigation, navPath);
  }
  for (const match of navigation.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu,
  )) {
    const href = match[1];
    const label = match[2];
    if (!href || !label) continue;
    points.push({
      href: normalizeHref(navPath, href),
      title: stripMarkup(label),
    });
  }
  return points;
}

function readNcxPoints(navigation: string, navigationPath: string) {
  const points = new Array<EpubNavigationPoint>();
  const pointPattern =
    /<(?:[\w.-]+:)?navLabel\b[^>]*>[\s\S]*?<(?:[\w.-]+:)?text\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?text\s*>[\s\S]*?<\/(?:[\w.-]+:)?navLabel\s*>[\s\S]*?<(?:[\w.-]+:)?content\b[^>]*\bsrc=["']([^"']+)["'][^>]*\/?\s*>/giu;
  for (const match of navigation.matchAll(pointPattern)) {
    const label = match[1];
    const href = match[2];
    if (!label || !href) continue;
    points.push({
      href: normalizeHref(navigationPath, href),
      title: stripMarkup(label),
    });
  }
  return points;
}

function isNavigationItem(item: ManifestItem) {
  const hasNavProperty =
    item["@_properties"]?.split(" ").includes("nav") ?? false;
  if (hasNavProperty) return true;
  return item["@_media-type"] === "application/x-dtbncx+xml";
}

function nonBlank(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed;
}

function optionalNonBlank(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function normalizeHref(parentFile: string, href: string) {
  const base = parentFile.split("/").slice(0, -1);
  const parts = [...base, ...href.split("/")];
  const normalized = new Array<string>();
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  return normalized.join("/");
}

function stripFragment(href: string) {
  return decodeURIComponent(href.split("#")[0] ?? href);
}

function fragmentFromHref(href: string) {
  const fragment = href.split("#")[1];
  return fragment ? decodeURIComponent(fragment) : undefined;
}

function sameDocument(first: string, second: string) {
  return stripFragment(first) === stripFragment(second);
}

function stripMarkup(value: string) {
  return textFromMarkup(value);
}

function fallbackEpubSection() {
  return [{ id: "section-1", title: "Book", included: true }];
}

function toArray<T>(value: T | T[] | undefined) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function readText(value: unknown) {
  let current = value;
  while (current !== undefined) {
    if (typeof current === "string") return current.trim();
    if (Array.isArray(current)) {
      current = current[0];
      continue;
    }
    if (!current || typeof current !== "object" || !("#text" in current)) {
      return undefined;
    }
    current = current["#text"];
  }
  return undefined;
}

interface ParsedContainer {
  container?: { rootfiles?: { rootfile?: RootFile | RootFile[] } };
}

interface RootFile {
  "@_full-path"?: string;
}

interface ParsedPackage {
  package: {
    metadata?: { title?: unknown; creator?: unknown };
    manifest?: { item?: ManifestItem | ManifestItem[] };
    spine?: { itemref?: SpineItem | SpineItem[] };
  };
}

interface ManifestItem {
  "@_id": string;
  "@_href": string;
  "@_media-type"?: string;
  "@_properties"?: string;
}

interface SpineItem {
  "@_idref": string;
}
