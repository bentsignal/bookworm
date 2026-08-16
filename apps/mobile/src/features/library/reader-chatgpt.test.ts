import { describe, expect, it } from "vitest";

import { chatGptAppUrl, chatGptDraftUrl } from "./reader-chatgpt";

describe("reader ChatGPT handoff", () => {
  it("uses the ChatGPT iOS app scheme", () => {
    expect(chatGptAppUrl()).toBe("com.openai.chat://chatgpt.com/");
  });

  it("builds an unsent draft with book and passage context", () => {
    const url = new URL(
      chatGptDraftUrl({
        author: "Ursula K. Le Guin",
        selectedText: "To light a candle\nis to cast a shadow.",
        title: "A Wizard of Earthsea",
      }),
    );

    expect(url.searchParams.get("prompt")).toBe(
      "I’m reading “A Wizard of Earthsea” by Ursula K. Le Guin.\n\n" +
        "Selected passage:\n> To light a candle\n> is to cast a shadow.\n\n",
    );
  });

  it("omits a missing author cleanly", () => {
    const url = new URL(
      chatGptDraftUrl({ selectedText: "A passage", title: "Unknown" }),
    );

    expect(url.searchParams.get("prompt")).toContain(
      "I’m reading “Unknown”.\n\n",
    );
  });
});
