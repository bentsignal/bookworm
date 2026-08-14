import { describe, expect, it } from "vitest";

import { chapterWindowIndices } from "./epub-navigation";

describe("chapterWindowIndices", () => {
  it("keeps the current chapter and its available neighbors mounted", () => {
    expect(chapterWindowIndices(2, 5)).toEqual([1, 2, 3]);
    expect(chapterWindowIndices(0, 5)).toEqual([0, 1]);
    expect(chapterWindowIndices(4, 5)).toEqual([3, 4]);
  });

  it("includes a distant pending chapter exactly once", () => {
    expect(chapterWindowIndices(1, 8, 6)).toEqual([0, 1, 2, 6]);
    expect(chapterWindowIndices(1, 8, 2)).toEqual([0, 1, 2]);
  });
});
