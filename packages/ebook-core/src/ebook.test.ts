import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { analyzeBook } from "./analyze";
import { buildEpubEdition } from "./epub-export";
import { buildPdfEdition } from "./export";

describe("ebook analysis", () => {
  it("reads PDF metadata and page count", async () => {
    const document = await PDFDocument.create();
    document.setTitle("The Dispossessed");
    document.setAuthor("Ursula K. Le Guin");
    document.addPage([300, 500]);
    document.addPage([320, 500]);

    await expect(
      analyzeBook(await document.save(), "fallback.pdf"),
    ).resolves.toMatchObject({
      title: "The Dispossessed",
      author: "Ursula K. Le Guin",
      format: "pdf",
      pageCount: 2,
      sections: [{ startPage: 1, endPage: 2 }],
    });
  });

  it("reads EPUB metadata and spine titles", async () => {
    const result = await analyzeBook(await createEpub(), "kindred.epub");

    expect(result).toMatchObject({
      title: "Kindred",
      author: "Octavia E. Butler",
      format: "epub",
    });
    expect(result.sections.map(({ title }) => title)).toEqual([
      "Arrival",
      "The River",
      "Afterword",
    ]);
  });
});

describe("EPUB editions", () => {
  it("rewrites metadata, reading order, chapter selection, and navigation", async () => {
    const editionBytes = await buildEpubEdition(await createEpub(), {
      title: "Kindred: A Reader's Copy",
      author: "Octavia Butler",
      modifiedAt: "2026-08-10T18:24:30.000Z",
      sections: [
        {
          id: "section-2",
          title: "The River & the Road",
          included: true,
          href: "OPS/two.xhtml",
        },
        {
          id: "section-1",
          title: "Arrival",
          included: true,
          href: "OPS/one.xhtml",
        },
        {
          id: "section-3",
          title: "Afterword",
          included: false,
          href: "OPS/three.xhtml",
        },
      ],
    });
    const analysis = await analyzeBook(editionBytes, "kindred-edition.epub");

    expect(analysis.title).toBe("Kindred: A Reader's Copy");
    expect(analysis.author).toBe("Octavia Butler");
    expect(analysis.sections.map(({ title }) => title)).toEqual([
      "The River & the Road",
      "Arrival",
    ]);

    const archive = await JSZip.loadAsync(editionBytes);
    const packageXml = await archive.file("OPS/package.opf")?.async("string");
    expect(packageXml).toContain("2026-08-10T18:24:30Z");
    expect(packageXml?.indexOf('idref="two"')).toBeLessThan(
      packageXml?.indexOf('idref="one"') ?? -1,
    );
    expect(packageXml).not.toContain('idref="three"');
    expect(firstZipEntry(editionBytes)).toEqual({
      compression: 0,
      name: "mimetype",
    });
  });

  it("refuses to export an empty chapter selection", async () => {
    await expect(
      buildEpubEdition(await createEpub(), {
        title: "Kindred",
        author: "Octavia E. Butler",
        modifiedAt: "2026-08-10T18:24:30.000Z",
        sections: [],
      }),
    ).rejects.toThrow("Include at least one chapter");
  });

  it("rewrites an EPUB 2 NCX table of contents", async () => {
    const source = await createEpub2();
    const imported = await analyzeBook(source, "parable.epub");
    expect(imported.sections.map(({ title }) => title)).toEqual([
      "Beginning",
      "Earthseed",
    ]);
    const [beginning, earthseed] = imported.sections;
    if (!beginning || !earthseed)
      throw new Error("Expected two EPUB chapters.");

    const edition = await buildEpubEdition(source, {
      title: "Parable of the Sower",
      author: "Octavia E. Butler",
      modifiedAt: "2026-08-10T18:24:30.000Z",
      sections: [{ ...earthseed, title: "Earthseed Verses" }, beginning],
    });
    const rewritten = await analyzeBook(edition, "parable-edition.epub");
    expect(rewritten.sections.map(({ title }) => title)).toEqual([
      "Earthseed Verses",
      "Beginning",
    ]);
  });
});

describe("PDF editions", () => {
  it("writes included page ranges in their chosen order", async () => {
    const source = await PDFDocument.create();
    source.addPage([100, 500]);
    source.addPage([200, 500]);
    source.addPage([300, 500]);

    const editionBytes = await buildPdfEdition(await source.save(), [
      {
        id: "last",
        title: "Last",
        included: true,
        startPage: 3,
        endPage: 3,
      },
      {
        id: "first",
        title: "First",
        included: true,
        startPage: 1,
        endPage: 1,
      },
    ]);
    const edition = await PDFDocument.load(editionBytes);

    expect(edition.getPages().map((page) => page.getWidth())).toEqual([
      300, 100,
    ]);
  });

  it("refuses to export an empty reading order", async () => {
    const source = await PDFDocument.create();
    source.addPage();

    await expect(buildPdfEdition(await source.save(), [])).rejects.toThrow(
      "Include at least one page",
    );
  });
});

async function createEpub() {
  const archive = new JSZip();
  archive.file("mimetype", "application/epub+zip", { compression: "STORE" });
  archive.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/package.opf" /></rootfiles></container>`,
  );
  archive.file(
    "OPS/package.opf",
    `<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Kindred</dc:title><dc:creator>Octavia E. Butler</dc:creator><meta property="dcterms:modified">2020-01-01T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/><item id="three" href="three.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/><itemref idref="three"/></spine></package>`,
  );
  archive.file(
    "OPS/nav.xhtml",
    `<html xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="one.xhtml">Arrival</a></li><li><a href="two.xhtml">The River</a></li><li><a href="three.xhtml">Afterword</a></li></ol></nav></body></html>`,
  );
  archive.file("OPS/one.xhtml", "<html><body>One</body></html>");
  archive.file("OPS/two.xhtml", "<html><body>Two</body></html>");
  archive.file("OPS/three.xhtml", "<html><body>Three</body></html>");
  return archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

async function createEpub2() {
  const archive = new JSZip();
  archive.file("mimetype", "application/epub+zip", { compression: "STORE" });
  archive.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf" /></rootfiles></container>`,
  );
  archive.file(
    "OEBPS/content.opf",
    `<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0"><metadata><dc:title>Parable</dc:title><dc:creator>Octavia Butler</dc:creator></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="one"/><itemref idref="two"/></spine></package>`,
  );
  archive.file(
    "OEBPS/toc.ncx",
    `<ncx><navMap><navPoint id="one"><navLabel><text>Beginning</text></navLabel><content src="one.xhtml"/></navPoint><navPoint id="two"><navLabel><text>Earthseed</text></navLabel><content src="two.xhtml"/></navPoint></navMap></ncx>`,
  );
  archive.file("OEBPS/one.xhtml", "<html><body>One</body></html>");
  archive.file("OEBPS/two.xhtml", "<html><body>Two</body></html>");
  return archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function firstZipEntry(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(0, true)).toBe(0x04034b50);
  const compression = view.getUint16(8, true);
  const nameLength = view.getUint16(26, true);
  const name = new TextDecoder().decode(bytes.slice(30, 30 + nameLength));
  return { compression, name };
}
