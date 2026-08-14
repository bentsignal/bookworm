import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import type { BookSection, EpubLocation } from "./model";
import { createEpubReaderSession } from "./epub-reader";

describe("createEpubReaderSession", () => {
  it("reuses an opened archive to render multiple sections", async () => {
    const archive = new JSZip();
    archive.file("one.xhtml", "<html><body><p>First chapter</p></body></html>");
    archive.file(
      "two.xhtml",
      "<html><body><p>Second chapter</p></body></html>",
    );
    const session = await createEpubReaderSession(
      await archive.generateAsync({ type: "uint8array" }),
    );
    const locations = [location("one.xhtml", 0), location("two.xhtml", 1)];
    const first = await session.buildSectionHtml(
      section("one", "one.xhtml", 0),
      locations,
      theme,
    );
    const second = await session.buildSectionHtml(
      section("two", "two.xhtml", 1),
      locations,
      theme,
    );

    expect(first).toContain("First chapter");
    expect(first).toContain('id="worm-reader-content"');
    expect(second).toContain("Second chapter");
  });
});

function section(id: string, href: string, index: number) {
  return {
    endLocation: index,
    href,
    id,
    included: true,
    startLocation: index,
    title: id,
  } satisfies BookSection;
}

function location(href: string, index: number) {
  return { excerpt: "", href, index, title: href } satisfies EpubLocation;
}

const theme = { background: "#fff", foreground: "#111", muted: "#aaa" };
