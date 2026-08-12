export function excerptFromMarkup(markup: string) {
  const text = textFromMarkup(markup);
  return text.length > 180 ? `${text.slice(0, 177).trim()}…` : text;
}

export function textFromMarkup(markup: string) {
  return decodeXmlEntities(
    markup
      .replaceAll(/<[^>]+>/gu, " ")
      .replaceAll(/\s+/gu, " ")
      .trim(),
  );
}

function decodeXmlEntities(value: string) {
  return value
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
