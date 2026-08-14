import { describe, expect, it } from "vitest";

import type { BookSection } from "@worm/ebook-core";

import {
  EPUB_RESTORE_COMPLETE_MESSAGE,
  epubScrollRestoreScript,
  resolveEpubPosition,
} from "./reader-progress";

const sections = [
  { id: "first", included: true, title: "First" },
  { id: "second", included: true, title: "Second" },
  { id: "third", included: true, title: "Third" },
] satisfies BookSection[];

describe("resolveEpubPosition", () => {
  it("restores the saved chapter and scroll progress", () => {
    expect(
      resolveEpubPosition(sections, {
        scrollProgress: 0.64,
        sectionId: "third",
        sectionIndex: 0,
      }),
    ).toEqual({ scrollProgress: 0.64, sectionIndex: 2 });
  });

  it("falls back to a bounded saved index when chapter ids change", () => {
    expect(
      resolveEpubPosition(sections, {
        scrollProgress: 2,
        sectionId: "missing",
        sectionIndex: 99,
      }),
    ).toEqual({ scrollProgress: 1, sectionIndex: 2 });
  });
});

describe("epubScrollRestoreScript", () => {
  it("retries layout-aware restoration before enabling progress writes", () => {
    const script = epubScrollRestoreScript(0.64);

    expect(script).toContain("maximum * 0.64");
    expect(script).toContain("attempts < 16");
    expect(script).toContain(EPUB_RESTORE_COMPLETE_MESSAGE);
  });

  it("bounds invalid persisted progress", () => {
    expect(epubScrollRestoreScript(4)).toContain("maximum * 1");
    expect(epubScrollRestoreScript(-2)).toContain("maximum * 0");
  });
});
