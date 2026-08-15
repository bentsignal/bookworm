import { describe, expect, it } from "vitest";

import { unresolvedPendingImports } from "./library-activity";

describe("unresolvedPendingImports", () => {
  it("keeps a completed import pending until the database query exposes it", () => {
    const pending = [{ fileName: "book.epub", id: "book" }];

    expect(unresolvedPendingImports(pending, [])).toBe(pending);
  });

  it("removes a pending import after its database row becomes visible", () => {
    const pending = [
      { fileName: "one.epub", id: "one" },
      { fileName: "two.pdf", id: "two" },
    ];

    expect(unresolvedPendingImports(pending, [{ id: "one" }])).toEqual([
      pending[1],
    ]);
  });
});
