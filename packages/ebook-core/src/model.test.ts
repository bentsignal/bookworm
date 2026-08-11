import { describe, expect, it } from "vitest";

import {
  createEditionFileName,
  getIncludedPageIndexes,
  moveSection,
  titleFromFileName,
} from "./model";

describe("book model", () => {
  it("turns file names into readable titles", () => {
    expect(titleFromFileName("the_left-hand-of-darkness.epub")).toBe(
      "The Left Hand Of Darkness",
    );
  });

  it("moves sections without mutating the original", () => {
    const sections = [
      { id: "a", title: "A", included: true },
      { id: "b", title: "B", included: true },
    ];
    expect(moveSection(sections, "b", -1).map(({ id }) => id)).toEqual([
      "b",
      "a",
    ]);
    expect(sections[0]?.id).toBe("a");
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
