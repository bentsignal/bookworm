import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

export async function extractEpubCover(source: Uint8Array) {
  const archive = await JSZip.loadAsync(source);
  return extractEpubCoverFromArchive(archive);
}

export async function extractEpubCoverFromArchive(archive: JSZip) {
  const rootFile = await getRootFile(archive);
  const packageXml = await archive.file(rootFile)?.async("string");
  if (!packageXml) return undefined;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Package fields are validated before use.
  const parsed = xmlParser.parse(packageXml) as ParsedPackage;
  const manifest = toArray(parsed.package?.manifest?.item);
  const item = findCoverItem(parsed, manifest);
  if (!item) return undefined;
  const path = normalizeHref(rootFile, item["@_href"]);
  const bytes = await archive.file(path)?.async("uint8array");
  if (!bytes) return undefined;
  return {
    bytes,
    extension: extensionForMediaType(item["@_media-type"], path),
  };
}

export type ExtractedEpubCover = NonNullable<
  Awaited<ReturnType<typeof extractEpubCoverFromArchive>>
>;

function findCoverItem(parsed: ParsedPackage, manifest: ManifestItem[]) {
  const coverId = toArray(parsed.package?.metadata?.meta).find(
    (meta) => meta["@_name"] === "cover",
  )?.["@_content"];
  return (
    manifest.find((candidate) =>
      candidate["@_properties"]?.split(" ").includes("cover-image"),
    ) ??
    manifest.find((candidate) => candidate["@_id"] === coverId) ??
    manifest.find(isNamedCoverImage)
  );
}

function isNamedCoverImage(candidate: ManifestItem) {
  return (
    candidate["@_media-type"]?.startsWith("image/") === true &&
    /(?:^|[\W_])cover(?:[\W_]|$)/iu.test(candidate["@_href"])
  );
}

async function getRootFile(archive: JSZip) {
  const containerXml = await archive
    .file("META-INF/container.xml")
    ?.async("string");
  if (!containerXml) throw new Error("This EPUB is missing its container.");
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Container fields are validated before use.
  const parsed = xmlParser.parse(containerXml) as ParsedContainer;
  const path = toArray(parsed.container?.rootfiles?.rootfile)[0]?.[
    "@_full-path"
  ];
  if (!path) throw new Error("This EPUB does not identify its package file.");
  return path;
}

function normalizeHref(parentFile: string, href: string) {
  const base = parentFile.split("/").slice(0, -1);
  const parts = [...base, ...decodeURIComponent(href).split("/")];
  const normalized = new Array<string>();
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(part);
  }
  return normalized.join("/");
}

function extensionForMediaType(mediaType: string | undefined, path: string) {
  if (mediaType === "image/jpeg") return "jpg";
  if (mediaType === "image/png") return "png";
  if (mediaType === "image/webp") return "webp";
  if (mediaType === "image/gif") return "gif";
  const extension = path.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/u.test(extension) ? extension : "jpg";
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
  package?: {
    metadata?: { meta?: MetaItem | MetaItem[] };
    manifest?: { item?: ManifestItem | ManifestItem[] };
  };
}

interface MetaItem {
  "@_content"?: string;
  "@_name"?: string;
}

interface ManifestItem {
  "@_href": string;
  "@_id": string;
  "@_media-type"?: string;
  "@_properties"?: string;
}
