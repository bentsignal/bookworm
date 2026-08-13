import type { SearchBarCommands } from "react-native-screens";
import { createRef } from "react";

export const nativeLibrarySearchRef = createRef<SearchBarCommands>();

export function focusNativeLibrarySearch() {
  nativeLibrarySearchRef.current?.focus();
}

export function blurNativeLibrarySearch() {
  nativeLibrarySearchRef.current?.blur();
}
