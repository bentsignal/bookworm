import type { BookSection } from "@worm/ebook-core";

interface SavedEpubPosition {
  scrollProgress: number;
  sectionId: string | null;
  sectionIndex: number;
}

export function resolveEpubPosition(
  sections: BookSection[],
  saved: SavedEpubPosition | undefined,
) {
  const matchingIndex = sections.findIndex(
    (section) => section.id === saved?.sectionId,
  );
  const fallbackIndex = saved?.sectionIndex ?? 0;
  return {
    scrollProgress: clamp(saved?.scrollProgress ?? 0, 0, 1),
    sectionIndex: clamp(
      matchingIndex >= 0 ? matchingIndex : fallbackIndex,
      0,
      Math.max(0, sections.length - 1),
    ),
  };
}

export function epubScrollRestoreScript(progress: number) {
  const bounded = clamp(progress, 0, 1);
  return `(function () {
    var attempts = 0;
    function restore() {
      var height = Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.documentElement ? document.documentElement.scrollHeight : 0
      );
      var maximum = Math.max(0, height - window.innerHeight);
      window.scrollTo(0, maximum * ${bounded});
      attempts += 1;
      if (attempts < 16) {
        setTimeout(restore, 50);
      } else {
        window.ReactNativeWebView.postMessage('${EPUB_RESTORE_COMPLETE_MESSAGE}');
      }
    }
    requestAnimationFrame(restore);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(restore);
    }
    Array.prototype.forEach.call(document.images || [], function (image) {
      if (!image.complete) image.addEventListener('load', restore, { once: true });
    });
  })(); true;`;
}

export const EPUB_RESTORE_COMPLETE_MESSAGE = "bookworm:restore-complete";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
