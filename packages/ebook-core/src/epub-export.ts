import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import type { EpubManifestItem } from "./epub-navigation";
import type { BookRecord, BookSection } from "./model";
import { generateEpubChapters } from "./epub-generated";
import {
  cleanEpubLocations,
  remapEpubSections,
} from "./epub-location-migration";
import { rewriteEpubNavigation } from "./epub-navigation";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

type EpubEdition = Pick<
  BookRecord,
  "author" | "epubLocations" | "modifiedAt" | "sections" | "title"
>;

interface EditionCover {
  bytes: Uint8Array;
  extension: string;
}

export async function buildEpubEdition(
  source: Uint8Array,
  edition: EpubEdition,
  cover?: EditionCover,
) {
  const archive = await JSZip.loadAsync(source);
  const { manifestItems, packageXml, rootFile } =
    await readPackageDocument(archive);
  const idByHref = new Map(
    manifestItems.map((item) => [
      normalizeHref(rootFile, item["@_href"]),
      item["@_id"],
    ]),
  );
  const locations = edition.epubLocations
    ? cleanEpubLocations(edition.epubLocations)
    : undefined;
  const sections = locations
    ? remapEpubSections(
        edition.sections,
        edition.epubLocations ?? [],
        locations,
      )
    : edition.sections;
  const selected = sections.filter((section) => section.included);
  if (selected.length === 0) {
    throw new Error("Include at least one chapter before exporting.");
  }
  const generated = locations
    ? await generateEpubChapters({
        archive,
        rootFile,
        packageXml,
        sections: selected,
        locations,
      })
    : undefined;
  const selectedIds = selected.map((section) =>
    sectionManifestId(section, idByHref),
  );
  let nextPackageXml = generated
    ? generated.packageXml
    : replaceSpine(packageXml, selectedIds);
  nextPackageXml = replaceMetadataText(nextPackageXml, "title", edition.title);
  nextPackageXml = replaceCreator(nextPackageXml, edition.author);
  nextPackageXml = replaceModifiedDate(nextPackageXml, edition.modifiedAt);
  if (cover) {
    const coverName = `bookworm-cover.${safeExtension(cover.extension)}`;
    archive.file(normalizeHref(rootFile, coverName), cover.bytes);
    nextPackageXml = replaceCoverMetadata(nextPackageXml, coverName);
  }
  archive.file(rootFile, nextPackageXml);

  await rewriteEpubNavigation(
    archive,
    rootFile,
    manifestItems,
    generated?.chapters.map(({ section }) => section) ?? selected,
  );

  await preserveMimetypeStorage(archive);
  return archive.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

function replaceCoverMetadata(packageXml: string, coverName: string) {
  const withoutCoverProperties = packageXml.replaceAll(
    /(<(?:[\w.-]+:)?item\b[^>]*\bproperties=["'])([^"']*)(["'][^>]*\/?>)/giu,
    (_item, start: string, properties: string, end: string) => {
      const next = properties
        .split(/\s+/u)
        .filter((property) => property && property !== "cover-image")
        .join(" ");
      return `${start}${next}${end}`;
    },
  );
  const mediaType = imageMediaType(coverName);
  const coverItem = `<item id="bookworm-cover" href="${coverName}" media-type="${mediaType}" properties="cover-image" />`;
  const withItem = withoutCoverProperties.replace(
    /<\/(?:[\w.-]+:)?manifest\s*>/iu,
    `  ${coverItem}\n$&`,
  );
  const meta = '<meta name="cover" content="bookworm-cover" />';
  const metaPattern =
    /<(?:[\w.-]+:)?meta\b[^>]*\bname=["']cover["'][^>]*\/?>/iu;
  if (metaPattern.test(withItem)) return withItem.replace(metaPattern, meta);
  return withItem.replace(/<\/(?:[\w.-]+:)?metadata\s*>/iu, `  ${meta}\n$&`);
}

function safeExtension(extension: string) {
  const safe = extension.replaceAll(/[^a-z0-9]/giu, "").toLowerCase();
  return safe || "jpg";
}

function imageMediaType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "image/jpeg";
}

async function readPackageDocument(archive: JSZip) {
  const rootFile = await getRootFile(archive);
  const packageEntry = archive.file(rootFile);
  const packageXml = await packageEntry?.async("string");
  if (!packageEntry || !packageXml) {
    throw new Error("This EPUB has no readable package file.");
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The parser has no schema-aware generic; required fields are checked as they are read.
  const parsed = xmlParser.parse(packageXml) as ParsedPackage;
  return {
    manifestItems: toArray(parsed.package.manifest?.item),
    packageXml,
    rootFile,
  };
}

async function getRootFile(archive: JSZip) {
  const containerXml = await archive
    .file("META-INF/container.xml")
    ?.async("string");
  if (!containerXml) throw new Error("This EPUB is missing its container.");
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The parser has no schema-aware generic; the path is checked below.
  const parsed = xmlParser.parse(containerXml) as ParsedContainer;
  const path = toArray(parsed.container?.rootfiles?.rootfile)[0]?.[
    "@_full-path"
  ];
  if (!path) throw new Error("This EPUB does not identify its package file.");
  return path;
}

function sectionManifestId(
  section: BookSection,
  idByHref: Map<string, string>,
) {
  if (!section.href) {
    throw new Error(
      `Chapter “${section.title}” is not linked to EPUB content.`,
    );
  }
  const id = idByHref.get(stripFragment(section.href));
  if (!id) {
    throw new Error(
      `Chapter “${section.title}” is missing from the EPUB manifest.`,
    );
  }
  return id;
}

function replaceSpine(packageXml: string, selectedIds: string[]) {
  const spinePattern = /<((?:[\w.-]+:)?spine)\b([^>]*)>([\s\S]*?)<\/\1\s*>/iu;
  const match = spinePattern.exec(packageXml);
  if (!match) throw new Error("This EPUB has no readable spine.");
  const inner = match[3] ?? "";
  const itemPattern =
    /<(?:(?:[\w.-]+):)?itemref\b[^>]*\bidref=["']([^"']+)["'][^>]*\/?\s*>/giu;
  const itemById = new Map<string, string>();
  for (const item of inner.matchAll(itemPattern)) {
    const id = item[1];
    if (id) itemById.set(id, item[0]);
  }
  const missing = selectedIds.find((id) => !itemById.has(id));
  if (missing)
    throw new Error(`The EPUB spine is missing manifest item “${missing}”.`);
  const indentation = /\n([\t ]*)</u.exec(inner)?.[1] ?? "    ";
  const items = selectedIds
    .map((id) => itemById.get(id))
    .join(`\n${indentation}`);
  return packageXml.replace(
    spinePattern,
    (_whole, name: string, attributes: string) => {
      return `<${name}${attributes}>\n${indentation}${items}\n</${name}>`;
    },
  );
}

function replaceMetadataText(xml: string, localName: string, value: string) {
  const escaped = escapeXmlText(value.trim() || "Untitled book");
  const pattern = new RegExp(
    `(<(?:[\\w.-]+:)?${localName}\\b[^>]*>)[\\s\\S]*?(<\\/(?:[\\w.-]+:)?${localName}\\s*>)`,
    "iu",
  );
  if (pattern.test(xml)) return xml.replace(pattern, `$1${escaped}$2`);
  return insertIntoMetadata(
    xml,
    `<dc:${localName}>${escaped}</dc:${localName}>`,
  );
}

function replaceCreator(xml: string, author: string | undefined) {
  const creatorPattern =
    /<(?:[\w.-]+:)?creator\b[^>]*(?:\/>|>[\s\S]*?<\/(?:[\w.-]+:)?creator\s*>)/giu;
  const normalized = author?.trim();
  if (!normalized) return xml.replaceAll(creatorPattern, "");
  if (creatorPattern.test(xml)) {
    creatorPattern.lastIndex = 0;
    let replaced = false;
    return xml.replace(creatorPattern, (match) => {
      if (replaced) return "";
      replaced = true;
      const open = /^<[^>]+>/u.exec(match)?.[0] ?? "<dc:creator>";
      if (open.endsWith("/>"))
        return `<dc:creator>${escapeXmlText(normalized)}</dc:creator>`;
      const close = /<\/[^>]+>$/u.exec(match)?.[0] ?? "</dc:creator>";
      return `${open}${escapeXmlText(normalized)}${close}`;
    });
  }
  return insertIntoMetadata(
    xml,
    `<dc:creator>${escapeXmlText(normalized)}</dc:creator>`,
  );
}

function replaceModifiedDate(xml: string, modifiedAt: string) {
  const normalized = new Date(modifiedAt)
    .toISOString()
    .replace(/\.\d{3}Z$/u, "Z");
  const pattern =
    /(<(?:[\w.-]+:)?meta\b[^>]*\bproperty=["']dcterms:modified["'][^>]*>)[\s\S]*?(<\/(?:[\w.-]+:)?meta\s*>)/iu;
  if (!pattern.test(xml)) return xml;
  return xml.replace(pattern, `$1${normalized}$2`);
}

function insertIntoMetadata(xml: string, element: string) {
  const closing = /<\/(?:[\w.-]+:)?metadata\s*>/iu;
  if (!closing.test(xml))
    throw new Error("This EPUB has no readable metadata section.");
  return xml.replace(closing, `  ${element}\n$&`);
}

async function preserveMimetypeStorage(archive: JSZip) {
  const entry = archive.file("mimetype");
  const mimetype = await entry?.async("string");
  if (mimetype) archive.file("mimetype", mimetype, { compression: "STORE" });
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
  return href.split("#")[0] ?? href;
}

function escapeXmlText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function toArray<T>(value: T | T[] | undefined) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

interface ParsedContainer {
  container?: { rootfiles?: { rootfile?: RootFile | RootFile[] } };
}

interface RootFile {
  "@_full-path"?: string;
}

interface ParsedPackage {
  package: {
    manifest?: { item?: EpubManifestItem | EpubManifestItem[] };
  };
}
