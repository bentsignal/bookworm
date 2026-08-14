import { describe, expect, it } from "vitest";

import migrations from "./migrations";

describe("embedded database migrations", () => {
  it("includes SQL for every journal entry", () => {
    const expected = migrations.journal.entries.map(
      ({ idx }) => `m${idx.toString().padStart(4, "0")}`,
    );

    expect(Object.keys(migrations.migrations)).toEqual(expected);
    expect(Object.values(migrations.migrations)).not.toContain("");
  });
});
