import { describe, expect, it } from "vitest";

import { parsePageRange } from "./page-range";

describe("parsePageRange", () => {
  it("accepts hyphen and en dash ranges", () => {
    expect(parsePageRange("12–28", 50)).toEqual({ start: 12, end: 28 });
    expect(parsePageRange("1-5", 50)).toEqual({ start: 1, end: 5 });
  });

  it("rejects reversed and out-of-bounds ranges", () => {
    expect(parsePageRange("8-4", 50)).toBeUndefined();
    expect(parsePageRange("1-51", 50)).toBeUndefined();
  });
});
