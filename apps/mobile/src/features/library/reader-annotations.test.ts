import { describe, expect, it } from "vitest";

import {
  applyReaderAnnotationsScript,
  parseReaderAnnotationEvent,
  readerSelectionScript,
} from "./reader-annotations";

describe("reader annotations", () => {
  it("parses narrowed selection and annotation messages", () => {
    expect(
      parseReaderAnnotationEvent(
        JSON.stringify({
          action: "note",
          endOffset: 12,
          selectedText: "A passage",
          startOffset: 3,
          type: "selection",
        }),
      ),
    ).toEqual({
      action: "note",
      endOffset: 12,
      selectedText: "A passage",
      startOffset: 3,
      type: "selection",
    });
    expect(parseReaderAnnotationEvent('{"type":"selection"}')).toBeUndefined();
  });

  it("builds scripts that capture and repaint stable text offsets", () => {
    expect(readerSelectionScript("highlight")).toContain("worm-reader-content");
    const script = applyReaderAnnotationsScript([
      {
        bookId: "book",
        createdAt: "now",
        endOffset: 9,
        id: "saved",
        kind: "highlight",
        note: null,
        sectionId: "chapter",
        selectedText: "passage",
        startOffset: 2,
        updatedAt: "now",
      },
    ]);

    expect(script).toContain('"id":"saved"');
    expect(script).toContain("data-worm-annotation");
  });
});
