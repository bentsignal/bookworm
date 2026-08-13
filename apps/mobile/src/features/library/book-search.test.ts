import { describe, expect, it } from "vitest";

import { findBookTextMatches, nextMatchIndex } from "./book-search";

describe("book text search", () => {
  const documents = [
    { position: 1, text: "Chapter one" },
    { position: 4, text: "Chapter three starts here. Chapter three." },
    { position: 9, text: "The end" },
  ];

  it("finds every case-insensitive occurrence", () => {
    expect(findBookTextMatches(documents, "chapter")).toEqual([
      { position: 1 },
      { position: 4 },
      { position: 4 },
    ]);
  });

  it("starts at the nearest result and wraps", () => {
    const matches = findBookTextMatches(documents, "chapter");
    expect(nextMatchIndex(matches, -1, 3, 1)).toBe(1);
    expect(nextMatchIndex(matches, -1, 3, -1)).toBe(0);
    expect(nextMatchIndex(matches, 2, 3, 1)).toBe(0);
    expect(nextMatchIndex(matches, 0, 3, -1)).toBe(2);
  });
});
