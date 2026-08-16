const CHATGPT_URL = "com.openai.chat://chatgpt.com/";

export function chatGptAppUrl() {
  return CHATGPT_URL;
}

export function chatGptDraftUrl({
  author,
  selectedText,
  title,
}: {
  author?: string;
  selectedText: string;
  title: string;
}) {
  const attribution = author?.trim() ? ` by ${author.trim()}` : "";
  const passage = selectedText
    .trim()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  const prompt = `I’m reading “${title.trim()}”${attribution}.\n\nSelected passage:\n${passage}\n\n`;
  return `${CHATGPT_URL}?prompt=${encodeURIComponent(prompt)}`;
}
