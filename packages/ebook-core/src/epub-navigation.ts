import type JSZip from "jszip";

import type { BookSection } from "./model";

export interface EpubManifestItem {
  "@_href": string;
  "@_id": string;
  "@_media-type"?: string;
  "@_properties"?: string;
}

export async function rewriteEpubNavigation(
  archive: JSZip,
  rootFile: string,
  manifestItems: EpubManifestItem[],
  sections: BookSection[],
) {
  const navigationItem = manifestItems.find(isNavigationItem);
  if (!navigationItem) return;
  const navigationPath = normalizeHref(rootFile, navigationItem["@_href"]);
  const navigationEntry = archive.file(navigationPath);
  const navigationXml = await navigationEntry?.async("string");
  if (!navigationEntry || !navigationXml) return;
  const rewritten = isNcx(navigationItem)
    ? rewriteNcx(navigationXml, navigationPath, sections)
    : rewriteNavigationDocument(navigationXml, navigationPath, sections);
  archive.file(navigationPath, rewritten);
}

function rewriteNavigationDocument(
  navigationXml: string,
  navigationPath: string,
  sections: BookSection[],
) {
  const typedNav =
    /<(?:[\w.-]+:)?nav\b[^>]*(?:(?:epub:)?type=["'][^"']*\btoc\b|role=["'][^"']*\bdoc-toc\b)[^>]*>/iu;
  const navMatch =
    typedNav.exec(navigationXml) ??
    /<(?:[\w.-]+:)?nav\b[^>]*>/iu.exec(navigationXml);
  if (!navMatch) return navigationXml;
  const navStart = navMatch.index + navMatch[0].length;
  const range = balancedElementRange(navigationXml, "ol", navStart);
  const list = navigationList(navigationPath, sections);
  if (!range) return insertNavigationList(navigationXml, navStart, list);
  return `${navigationXml.slice(0, range.start)}${list}${navigationXml.slice(range.end)}`;
}

function insertNavigationList(
  navigationXml: string,
  navStart: number,
  list: string,
) {
  const closeNav = /<\/(?:[\w.-]+:)?nav\s*>/giu;
  closeNav.lastIndex = navStart;
  const close = closeNav.exec(navigationXml);
  if (!close) return navigationXml;
  return `${navigationXml.slice(0, close.index)}${list}\n${navigationXml.slice(close.index)}`;
}

function navigationList(navigationPath: string, sections: BookSection[]) {
  const items = sections
    .map((section) => {
      const href = relativeHref(navigationPath, section.href ?? "");
      return `    <li><a href="${escapeXmlAttribute(href)}">${escapeXmlText(section.title)}</a></li>`;
    })
    .join("\n");
  return `<ol>\n${items}\n  </ol>`;
}

function rewriteNcx(
  ncx: string,
  navigationPath: string,
  sections: BookSection[],
) {
  const pattern =
    /(<(?:[\w.-]+:)?navMap\b[^>]*>)[\s\S]*?(<\/(?:[\w.-]+:)?navMap\s*>)/iu;
  if (!pattern.test(ncx)) return ncx;
  const points = sections
    .map((section, index) => {
      const source = relativeHref(navigationPath, section.href ?? "");
      const title = escapeXmlText(section.title);
      return `    <navPoint id="lib-${index + 1}" playOrder="${index + 1}"><navLabel><text>${title}</text></navLabel><content src="${escapeXmlAttribute(source)}"/></navPoint>`;
    })
    .join("\n");
  return ncx.replace(pattern, `$1\n${points}\n  $2`);
}

function balancedElementRange(source: string, localName: string, from: number) {
  const tokenPattern = new RegExp(
    `<\\/?(?:[\\w.-]+:)?${localName}\\b[^>]*>`,
    "giu",
  );
  tokenPattern.lastIndex = from;
  let start = -1;
  let depth = 0;
  for (const token of source.matchAll(tokenPattern)) {
    const index = token.index;
    const closing = token[0].startsWith("</");
    if (!closing) {
      if (start < 0) start = index;
      depth += 1;
      continue;
    }
    depth -= 1;
    if (start >= 0 && depth === 0) {
      return { start, end: index + token[0].length };
    }
  }
  return undefined;
}

function isNavigationItem(item: EpubManifestItem) {
  return (
    item["@_properties"]?.split(" ").includes("nav") === true || isNcx(item)
  );
}

function isNcx(item: EpubManifestItem) {
  return item["@_media-type"] === "application/x-dtbncx+xml";
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

function relativeHref(fromFile: string, targetFile: string) {
  const from = fromFile.split("/").slice(0, -1);
  const target = targetFile.split("/");
  while (from[0] && from[0] === target[0]) {
    from.shift();
    target.shift();
  }
  return `${"../".repeat(from.length)}${target.join("/")}`;
}

function escapeXmlText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeXmlAttribute(value: string) {
  return escapeXmlText(value).replaceAll('"', "&quot;");
}
