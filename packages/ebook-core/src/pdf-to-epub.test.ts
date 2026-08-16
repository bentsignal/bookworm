import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { analyzeBook } from "./analyze";
import { buildEpubFromPdf } from "./pdf-to-epub";

describe("PDF to EPUB conversion", () => {
  it("creates EPUB chapters from selected page ranges in their chosen order", async () => {
    const converted = await buildEpubFromPdf(
      [
        "First page\ncontinues here.",
        "Second page",
        "Final page\n\nA new paragraph.",
      ],
      {
        identifier: "pdf-book",
        title: "A Converted Book",
        author: "Lib Reader",
        modifiedAt: "2026-08-10T18:24:30.000Z",
        sections: [
          {
            id: "ending",
            title: "The Ending",
            included: true,
            startPage: 3,
            endPage: 3,
          },
          {
            id: "opening",
            title: "The Opening",
            included: true,
            startPage: 1,
            endPage: 2,
          },
        ],
      },
    );
    const analysis = await analyzeBook(converted, "converted.epub");
    const archive = await JSZip.loadAsync(converted);
    const firstChapter = await archive
      .file("EPUB/chapter-1.xhtml")
      ?.async("string");

    expect(analysis).toMatchObject({
      title: "A Converted Book",
      author: "Lib Reader",
      format: "epub",
    });
    expect(analysis.sections.map(({ title }) => title)).toEqual([
      "The Ending",
      "The Opening",
    ]);
    expect(firstChapter).toContain("Final page");
    expect(firstZipEntry(converted)).toEqual({
      compression: 0,
      name: "mimetype",
    });
  });

  it("explains when a PDF contains no extractable text", async () => {
    await expect(
      buildEpubFromPdf(["", "   "], {
        identifier: "scan",
        title: "Scanned Book",
        modifiedAt: "2026-08-10T18:24:30.000Z",
        sections: [
          {
            id: "all",
            title: "Complete book",
            included: true,
            startPage: 1,
            endPage: 2,
          },
        ],
      }),
    ).rejects.toThrow("no readable text");
  });
});

function firstZipEntry(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(0, true)).toBe(0x04034b50);
  const compression = view.getUint16(8, true);
  const nameLength = view.getUint16(26, true);
  const name = new TextDecoder().decode(bytes.slice(30, 30 + nameLength));
  return { compression, name };
}
