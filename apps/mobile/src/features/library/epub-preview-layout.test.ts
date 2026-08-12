import { describe, expect, it } from "vitest";

import { epubPreviewLayout } from "./epub-preview-layout";

describe("EPUB preview layout", () => {
  it("keeps short passages compact", () => {
    expect(epubPreviewLayout("Ben: Should I come home?", 321, 1)).toEqual({
      height: 48,
      lineCount: 1,
    });
  });

  it("allocates deterministic space for mixed passage lengths", () => {
    const short = epubPreviewLayout("Scott: Yes, of course.", 321, 1);
    const long = epubPreviewLayout(
      "At the end of the preparation process and after the banks had signed off, our director of finance received a call from our banker.",
      321,
      1,
    );

    expect(long.height).toBeGreaterThan(short.height);
    expect(long.lineCount).toBe(5);
  });

  it("caps malformed or unusually long excerpts", () => {
    const layout = epubPreviewLayout("word ".repeat(200), 260, 2);

    expect(layout.lineCount).toBe(6);
    expect(layout.height).toBe(256);
  });
});
