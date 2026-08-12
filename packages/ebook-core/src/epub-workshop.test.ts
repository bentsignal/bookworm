import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { analyzeBook } from "./analyze";
import { extractEpubCover } from "./epub-cover";
import { buildEpubEdition } from "./epub-export";
import { buildEpubBoundaryHtml } from "./epub-reader";

describe("EPUB workshop", () => {
  it("discovers editable locations inside large spine documents", async () => {
    const analysis = await analyzeBook(await createEpub(), "kindred.epub");
    if (analysis.format !== "epub") throw new Error("Expected an EPUB.");

    expect(analysis.epubLocations.map(({ title }) => title)).toEqual([
      "One",
      "The River",
      "First scene.",
      "The Road",
      "Second scene.",
      "Three",
    ]);
    expect(analysis.epubLocations[4]?.excerpt).toContain("Second scene");
    expect(analysis.epubStructureVersion).toBe(2);
    expect(analysis.sections.map(({ title }) => title)).toEqual([
      "Arrival",
      "The River",
      "The Road",
      "Afterword",
    ]);
  });

  it("extracts the packaged cover", async () => {
    const source = await createEpub(true);
    const cover = await extractEpubCover(source);

    expect(cover?.extension).toBe("jpg");
    expect(cover?.bytes).toEqual(new Uint8Array([4, 5, 6]));
  });

  it("renders all text blocks as one reusable boundary document", async () => {
    const source = await createEpub();
    const analysis = await analyzeBook(source, "kindred.epub");
    if (analysis.format !== "epub") throw new Error("Expected an EPUB.");
    const html = await buildEpubBoundaryHtml(
      source,
      analysis.epubLocations,
      0,
      { background: "#fff", foreground: "#111", muted: "#ccc" },
    );

    expect(html).toContain('data-location="6"');
    expect(html).toContain('class="bookworm-boundary selected"');
    expect(html).toContain("Second scene.");
    expect(html).toContain("First scene.");
  });

  it("exports user-defined ranges as distinct chapters", async () => {
    const source = await createEpub();
    const imported = await analyzeBook(source, "kindred.epub");
    if (imported.format !== "epub") throw new Error("Expected an EPUB.");

    const edition = await buildEpubEdition(source, {
      title: imported.title,
      author: imported.author,
      modifiedAt: "2026-08-10T18:24:30.000Z",
      epubLocations: imported.epubLocations,
      sections: [
        {
          id: "road",
          title: "The Road Ahead",
          href: "OPS/two.xhtml",
          included: true,
          startLocation: 4,
          endLocation: 4,
        },
      ],
    });
    const result = await JSZip.loadAsync(edition);
    const chapter = await result
      .file("OPS/bookworm-chapter-1.xhtml")
      ?.async("string");

    expect(chapter).toContain("The Road Ahead");
    expect(chapter).toContain("Second scene.");
    expect(chapter).not.toContain("First scene.");
    await expect(analyzeBook(edition, "edited.epub")).resolves.toMatchObject({
      sections: [{ title: "The Road Ahead" }],
    });
  });
});

async function createEpub(withCover = false) {
  const archive = new JSZip();
  const coverItem = withCover
    ? '<item id="cover" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>'
    : "";
  archive.file("mimetype", "application/epub+zip", { compression: "STORE" });
  archive.file(
    "META-INF/container.xml",
    '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/package.opf" /></rootfiles></container>',
  );
  archive.file(
    "OPS/package.opf",
    `<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Kindred</dc:title><dc:creator>Octavia E. Butler</dc:creator></metadata><manifest>${coverItem}<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/><item id="three" href="three.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/><itemref idref="three"/></spine></package>`,
  );
  archive.file(
    "OPS/nav.xhtml",
    '<html xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="one.xhtml">Arrival</a></li><li><a href="two.xhtml#river">The River</a></li><li><a href="two.xhtml#road">The Road</a></li><li><a href="three.xhtml">Afterword</a></li></ol></nav></body></html>',
  );
  archive.file("OPS/one.xhtml", "<html><body>One</body></html>");
  archive.file(
    "OPS/two.xhtml",
    '<html><body><h1 id="river">The River</h1><p>First scene.</p><h2 id="road">The Road</h2><p>Second scene.</p></body></html>',
  );
  archive.file("OPS/three.xhtml", "<html><body>Three</body></html>");
  if (withCover) archive.file("OPS/cover.jpg", new Uint8Array([4, 5, 6]));
  return archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
