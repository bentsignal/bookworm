export function chapterWindowIndices(
  currentIndex: number,
  chapterCount: number,
  pendingIndex?: number,
) {
  const indices = [currentIndex - 1, currentIndex, currentIndex + 1];
  if (pendingIndex !== undefined) indices.push(pendingIndex);
  return [...new Set(indices)].filter(
    (index) => index >= 0 && index < chapterCount,
  );
}
