import type { ReaderAnnotation } from "~/db/catalog";

export interface ReaderSelectionMessage {
  action: "highlight" | "note" | "unhighlight";
  endOffset: number;
  selectedText: string;
  startOffset: number;
  type: "selection";
}

export interface ReaderAnnotationMessage {
  id: string;
  type: "annotation-press";
}

export interface ReaderSelectionStateMessage {
  hasHighlight: boolean;
  type: "selection-state";
}

export type ReaderAnnotationEvent =
  | ReaderAnnotationMessage
  | ReaderSelectionMessage
  | ReaderSelectionStateMessage;

export function readerSelectionObserverScript() {
  return `(function () {
    if (window.__wormSelectionObserver) return;
    function publishSelectionState() {
      window.clearTimeout(window.__wormSelectionTimer);
      window.__wormSelectionTimer = window.setTimeout(function () {
        var root = document.getElementById('worm-reader-content');
        var selection = window.getSelection();
        var hasHighlight = false;
        if (root && selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          var range = selection.getRangeAt(0);
          if (root.contains(range.commonAncestorContainer)) {
            Array.prototype.some.call(root.querySelectorAll('mark[data-worm-kind="highlight"]'), function (mark) {
              if (!range.intersectsNode(mark)) return false;
              hasHighlight = true;
              return true;
            });
          }
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({
          hasHighlight: hasHighlight,
          type: 'selection-state'
        }));
      }, 0);
    }
    document.addEventListener('selectionchange', publishSelectionState);
    window.__wormSelectionObserver = true;
  })(); true;`;
}

export function readerSelectionScript(
  action: "highlight" | "note" | "unhighlight",
) {
  return `(function () {
    var root = document.getElementById('worm-reader-content');
    var selection = window.getSelection();
    if (!root || !selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    var range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    var prefix = document.createRange();
    prefix.selectNodeContents(root);
    prefix.setEnd(range.startContainer, range.startOffset);
    var startOffset = prefix.toString().length;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      action: '${action}',
      endOffset: startOffset + range.toString().length,
      selectedText: range.toString(),
      startOffset: startOffset,
      type: 'selection'
    }));
  })(); true;`;
}

export function applyReaderAnnotationsScript(
  annotations: ReaderAnnotation[],
  scrollToId?: string,
) {
  const values = annotations.map((annotation) => ({
    endOffset: annotation.endOffset,
    id: annotation.id,
    kind: annotation.kind,
    startOffset: annotation.startOffset,
  }));
  return `(function () {
    var root = document.getElementById('worm-reader-content');
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('mark[data-worm-annotation]'), function (mark) {
      mark.replaceWith(document.createTextNode(mark.textContent || ''));
    });
    root.normalize();

    function textNodes() {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var nodes = [];
      var node;
      while ((node = walker.nextNode())) nodes.push(node);
      return nodes;
    }

    function apply(annotation) {
      var nodes = textNodes();
      var cursor = 0;
      nodes.forEach(function (node) {
        var length = node.nodeValue ? node.nodeValue.length : 0;
        var nodeStart = cursor;
        var nodeEnd = cursor + length;
        cursor = nodeEnd;
        if (annotation.endOffset <= nodeStart || annotation.startOffset >= nodeEnd) return;
        var start = Math.max(0, annotation.startOffset - nodeStart);
        var end = Math.min(length, annotation.endOffset - nodeStart);
        if (start >= end) return;
        var range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        var mark = document.createElement('mark');
        mark.dataset.wormAnnotation = annotation.id;
        mark.dataset.wormKind = annotation.kind;
        range.surroundContents(mark);
      });
    }

    ${JSON.stringify(values)}
      .slice()
      .sort(function (left, right) { return right.startOffset - left.startOffset; })
      .forEach(apply);

    if (!window.__wormAnnotationListener) {
      root.addEventListener('click', function (event) {
        var target = event.target && event.target.closest
          ? event.target.closest('mark[data-worm-annotation]')
          : null;
        if (!target) return;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          id: target.dataset.wormAnnotation,
          type: 'annotation-press'
        }));
      });
      window.__wormAnnotationListener = true;
    }
    var requested = ${JSON.stringify(scrollToId)};
    if (requested) {
      var target = root.querySelector('mark[data-worm-annotation="' + requested + '"]');
      if (target) target.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  })(); true;`;
}

// eslint-disable-next-line complexity -- Every WebView field is narrowed before crossing the native boundary.
export function parseReaderAnnotationEvent(value: string) {
  try {
    // eslint-disable-next-line no-restricted-syntax -- JSON must be narrowed from an untrusted WebView message before use.
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      return undefined;
    }
    if (
      parsed.type === "annotation-press" &&
      "id" in parsed &&
      typeof parsed.id === "string"
    ) {
      return {
        id: parsed.id,
        type: "annotation-press",
      } satisfies ReaderAnnotationMessage;
    }
    if (
      parsed.type === "selection-state" &&
      "hasHighlight" in parsed &&
      typeof parsed.hasHighlight === "boolean"
    ) {
      return {
        hasHighlight: parsed.hasHighlight,
        type: "selection-state",
      } satisfies ReaderSelectionStateMessage;
    }
    if (
      parsed.type === "selection" &&
      "action" in parsed &&
      (parsed.action === "highlight" ||
        parsed.action === "note" ||
        parsed.action === "unhighlight") &&
      "startOffset" in parsed &&
      typeof parsed.startOffset === "number" &&
      "endOffset" in parsed &&
      typeof parsed.endOffset === "number" &&
      "selectedText" in parsed &&
      typeof parsed.selectedText === "string"
    ) {
      return {
        action: parsed.action,
        endOffset: parsed.endOffset,
        selectedText: parsed.selectedText,
        startOffset: parsed.startOffset,
        type: "selection",
      } satisfies ReaderSelectionMessage;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
