export interface BookSearchDocument {
  position: number;
  text: string;
}

export interface BookSearchMatch {
  position: number;
}

export function findBookTextMatches(
  documents: BookSearchDocument[],
  query: string,
) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return new Array<BookSearchMatch>();

  const matches = new Array<BookSearchMatch>();
  for (const document of documents) {
    const text = document.text.toLocaleLowerCase();
    let offset = 0;
    while (offset < text.length) {
      const match = text.indexOf(needle, offset);
      if (match < 0) break;
      matches.push({ position: document.position });
      offset = match + Math.max(needle.length, 1);
    }
  }
  return matches;
}

export function nextMatchIndex(
  matches: BookSearchMatch[],
  currentIndex: number,
  currentPosition: number,
  direction: -1 | 1,
) {
  if (matches.length === 0) return -1;
  if (currentIndex >= 0) {
    return (currentIndex + direction + matches.length) % matches.length;
  }
  if (direction === 1) {
    const next = matches.findIndex(
      (match) => match.position >= currentPosition,
    );
    return next < 0 ? 0 : next;
  }
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    if ((matches[index]?.position ?? 0) <= currentPosition) return index;
  }
  return matches.length - 1;
}
