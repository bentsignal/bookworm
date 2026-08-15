import type { PendingBookImport } from "./import-book-files";

const listeners = new Set<() => void>();
const noPendingImports = new Array<PendingBookImport>();
let activity = {
  isAddingToLibrary: false,
  pendingImports: noPendingImports,
};

export function getLibraryActivity() {
  return activity;
}

export function setLibraryActivity(update: Partial<typeof activity>) {
  activity = { ...activity, ...update };
  for (const listener of listeners) listener();
}

export function subscribeLibraryActivity(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
