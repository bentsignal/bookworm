import type { BookSection, EpubLocation } from "./model";
import { sectionLocationRange } from "./epub-content";
import { normalizeEpubWhitespace } from "./epub-text";

type Edge = "start" | "end";

interface LocationCandidate {
  index: number;
  location: EpubLocation;
}

export function cleanEpubLocations(locations: EpubLocation[]) {
  return locations.flatMap((location) => {
    const excerpt = normalizeEpubWhitespace(location.excerpt);
    const title = normalizeEpubWhitespace(location.title);
    if (!excerpt && !title) return [];
    return [{ ...location, excerpt, title: title || excerpt }];
  });
}

export function remapEpubSections(
  sections: BookSection[],
  oldLocations: EpubLocation[],
  newLocations: EpubLocation[],
) {
  if (oldLocations.length === 0 || newLocations.length === 0) return sections;
  return sections.map((section) => {
    const oldRange = sectionLocationRange(section, oldLocations);
    const start = remapBoundary(
      oldLocations[oldRange.start],
      newLocations,
      "start",
    );
    const end = Math.max(
      start,
      remapBoundary(oldLocations[oldRange.end], newLocations, "end"),
    );
    return {
      ...section,
      href: newLocations[start]?.href ?? section.href,
      startLocation: start,
      endLocation: end,
    };
  });
}

function remapBoundary(
  oldLocation: EpubLocation | undefined,
  newLocations: EpubLocation[],
  edge: Edge,
) {
  const fallback = edgeFallback(newLocations, edge);
  if (!oldLocation) return fallback;
  const candidates = locationCandidates(newLocations, oldLocation.href);
  if (candidates.length === 0) return fallback;
  const exact = candidates.find(({ location }) =>
    sameOffsets(location, oldLocation),
  );
  if (exact) return exact.index;
  const offset =
    edge === "start" ? oldLocation.startOffset : oldLocation.endOffset;
  return remapOffset(candidates, offset, edge);
}

function remapOffset(
  candidates: LocationCandidate[],
  offset: number | undefined,
  edge: Edge,
) {
  if (offset === undefined) return candidateEdge(candidates, edge);
  const overlapping = candidates.find(({ location }) =>
    overlapsOffset(location, offset, edge),
  );
  if (overlapping) return overlapping.index;
  return edge === "start"
    ? nearestStart(candidates, offset)
    : nearestEnd(candidates, offset);
}

function locationCandidates(locations: EpubLocation[], href: string) {
  const document = stripUrlSuffix(href);
  return locations.flatMap((location, index) =>
    stripUrlSuffix(location.href) === document ? [{ index, location }] : [],
  );
}

function sameOffsets(first: EpubLocation, second: EpubLocation) {
  return (
    first.startOffset === second.startOffset &&
    first.endOffset === second.endOffset
  );
}

function overlapsOffset(location: EpubLocation, offset: number, edge: Edge) {
  const start = location.startOffset ?? 0;
  const end = location.endOffset ?? Number.POSITIVE_INFINITY;
  return edge === "start"
    ? start <= offset && end > offset
    : start < offset && end >= offset;
}

function nearestStart(candidates: LocationCandidate[], offset: number) {
  return (
    candidates.find(({ location }) => (location.startOffset ?? 0) >= offset)
      ?.index ?? candidateEdge(candidates, "end")
  );
}

function nearestEnd(candidates: LocationCandidate[], offset: number) {
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const candidate = candidates[index];
    if (
      candidate &&
      (candidate.location.endOffset ?? Number.POSITIVE_INFINITY) <= offset
    ) {
      return candidate.index;
    }
  }
  return candidateEdge(candidates, "start");
}

function candidateEdge(candidates: LocationCandidate[], edge: Edge) {
  const candidate =
    edge === "start" ? candidates[0] : candidates[candidates.length - 1];
  return candidate?.index ?? 0;
}

function edgeFallback(locations: EpubLocation[], edge: Edge) {
  return edge === "start" ? 0 : Math.max(0, locations.length - 1);
}

function stripUrlSuffix(value: string) {
  return value.split(/[?#]/u)[0] ?? value;
}
