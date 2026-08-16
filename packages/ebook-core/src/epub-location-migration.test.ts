import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import type { EpubLocation } from "./model";
import { analyzeBook } from "./analyze";
import { buildEpubEdition } from "./epub-export";
import {
  cleanEpubLocations,
  remapEpubSections,
} from "./epub-location-migration";

describe("EPUB location migration", () => {
  it("drops encoded-whitespace blocks during discovery", async () => {
    const analysis = await analyzeBook(await createSpacedEpub(), "spaced.epub");
    if (analysis.format !== "epub") throw new Error("Expected an EPUB.");

    expect(analysis.epubLocations.map(({ excerpt }) => excerpt)).toEqual([
      "First paragraph.",
      "Second paragraph.",
    ]);
  });

  it("remaps saved chapter ranges around removed locations", () => {
    const oldLocations = locationsWithEmptyBlock();
    const cleaned = cleanEpubLocations(oldLocations);
    const [section] = remapEpubSections(
      [
        {
          id: "chapter",
          title: "Kept title",
          included: false,
          startLocation: 1,
          endLocation: 2,
        },
      ],
      oldLocations,
      cleaned,
    );

    expect(cleaned).toHaveLength(2);
    expect(section).toMatchObject({
      id: "chapter",
      title: "Kept title",
      included: false,
      startLocation: 1,
      endLocation: 1,
    });
  });

  it("removes stale empty locations from generated EPUB chapters", async () => {
    const source = await createSpacedEpub();
    const analysis = await analyzeBook(source, "spaced.epub");
    if (analysis.format !== "epub") throw new Error("Expected an EPUB.");
    const [first, second] = analysis.epubLocations;
    if (!first || !second) throw new Error("Expected two text locations.");
    const locations = [
      first,
      location("\n\n", first.endOffset ?? 0, second.startOffset ?? 0),
      second,
    ];
    const edition = await buildEpubEdition(source, {
      title: analysis.title,
      modifiedAt: "2026-08-12T18:00:00.000Z",
      epubLocations: locations,
      sections: [
        {
          id: "complete",
          title: "Complete book",
          included: true,
          startLocation: 0,
          endLocation: 2,
        },
      ],
    });
    const result = await JSZip.loadAsync(edition);
    const chapter = await result
      .file("OPS/lib-chapter-1.xhtml")
      ?.async("string");

    expect(chapter).toContain("First paragraph.");
    expect(chapter).toContain("Second paragraph.");
    expect(chapter).not.toContain("&#10;");
    expect(chapter).not.toContain("&nbsp;");
  });
});

function locationsWithEmptyBlock() {
  return [
    location("First paragraph.", 0, 23),
    location("\n\n", 23, 44),
    location("Second paragraph.", 72, 96),
  ];
}

function location(text: string, startOffset: number, endOffset: number) {
  return {
    href: "OPS/content.xhtml",
    index: startOffset,
    title: text,
    excerpt: text,
    startOffset,
    endOffset,
  } satisfies EpubLocation;
}

async function createSpacedEpub() {
  const archive = new JSZip();
  archive.file("mimetype", "application/epub+zip", { compression: "STORE" });
  archive.file(
    "META-INF/container.xml",
    '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/package.opf" /></rootfiles></container>',
  );
  archive.file(
    "OPS/package.opf",
    '<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Spaced</dc:title></metadata><manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="content"/></spine></package>',
  );
  archive.file(
    "OPS/content.xhtml",
    "<html><body><p>First paragraph.</p><p>&#10;&#13;&#x2028;</p><p>&nbsp;</p><p>Second paragraph.</p></body></html>",
  );
  return archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
