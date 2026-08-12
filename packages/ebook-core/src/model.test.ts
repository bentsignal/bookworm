import { describe, expect, it } from "vitest";

import {
  createEditionFileName,
  getIncludedPageIndexes,
  removeSections,
  reorderSections,
  titleFromFileName,
} from "./model";

describe("book model", () => {
  it("turns file names into readable titles", () => {
    expect(titleFromFileName("the_left-hand-of-darkness.epub")).toBe(
      "The Left Hand Of Darkness",
    );
  });

  it("reorders sections using native list indices without mutating the original", () => {
    const sections = [
      { id: "a", title: "A", included: true },
      { id: "b", title: "B", included: true },
      { id: "c", title: "C", included: true },
    ];
    expect(reorderSections(sections, [0], 3).map(({ id }) => id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(sections[0]?.id).toBe("a");
  });

  it("removes the sections selected by a native list", () => {
    const sections = [
      { id: "a", title: "A", included: true },
      { id: "b", title: "B", included: true },
      { id: "c", title: "C", included: true },
    ];
    expect(removeSections(sections, [0, 2]).map(({ id }) => id)).toEqual(["b"]);
  });

  it("expands included page ranges in section order", () => {
    expect(
      getIncludedPageIndexes(
        [
          {
            id: "two",
            title: "Two",
            included: true,
            startPage: 3,
            endPage: 4,
          },
          {
            id: "one",
            title: "One",
            included: true,
            startPage: 1,
            endPage: 2,
          },
        ],
        4,
      ),
    ).toEqual([2, 3, 0, 1]);
  });

  it("creates safe edition filenames", () => {
    expect(createEditionFileName("A Wizard of Earthsea", "pdf")).toBe(
      "a-wizard-of-earthsea-worm-edition.pdf",
    );
  });
});
