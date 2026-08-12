import { describe, expect, it } from "vitest";

import {
  excerptFromMarkup,
  normalizeEpubWhitespace,
  textFromMarkup,
} from "./epub-text";

describe("EPUB text", () => {
  it("collapses whitespace introduced by decoded character references", () => {
    const markup = "<p>First line&#10;&#13;&#x2028;Second&nbsp;&nbsp;line</p>";

    expect(textFromMarkup(markup)).toBe("First line Second line");
    expect(excerptFromMarkup(markup)).toBe("First line Second line");
  });

  it("normalizes excerpts already stored in the library", () => {
    expect(normalizeEpubWhitespace("First\n\n\u0085\u2028 Second\tline")).toBe(
      "First Second line",
    );
  });
});
