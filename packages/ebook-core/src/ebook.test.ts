import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { analyzeBook } from "./analyze";
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
    const archive = new JSZip();
    archive.file("mimetype", "application/epub+zip");
    archive.file(
      "META-INF/container.xml",
      `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/package.opf" /></rootfiles></container>`,
    );
    archive.file(
      "OPS/package.opf",
      `<?xml version="1.0"?><package><metadata><dc:title>Kindred</dc:title><dc:creator>Octavia E. Butler</dc:creator></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>`,
    );
    archive.file(
      "OPS/nav.xhtml",
      `<html><body><nav><ol><li><a href="one.xhtml">Arrival</a></li><li><a href="two.xhtml">The River</a></li></ol></nav></body></html>`,
    );

    const result = await analyzeBook(
      await archive.generateAsync({ type: "uint8array" }),
      "kindred.epub",
    );

    expect(result).toMatchObject({
      title: "Kindred",
      author: "Octavia E. Butler",
      format: "epub",
    });
    expect(result.sections.map(({ title }) => title)).toEqual([
      "Arrival",
      "The River",
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
