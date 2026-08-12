export function excerptFromMarkup(markup: string) {
  const text = textFromMarkup(markup);
  return text.length > 180 ? `${text.slice(0, 177).trim()}…` : text;
}

export function textFromMarkup(markup: string) {
  return normalizeEpubWhitespace(
    decodeXmlEntities(markup.replaceAll(/<[^>]+>/gu, " ")),
  );
}

export function normalizeEpubWhitespace(value: string) {
  return value.replaceAll(/[\s\u0085]+/gu, " ").trim();
}

function decodeXmlEntities(value: string) {
  return value
    .replaceAll(/&nbsp;/giu, "\u00a0")
    .replaceAll("&amp;", "&")
    .replaceAll("&apos;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&quot;", '"')
    .replaceAll(/&#(\d+);/gu, (_entity, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10)),
    )
    .replaceAll(/&#x([\da-f]+);/giu, (_entity, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    );
}
