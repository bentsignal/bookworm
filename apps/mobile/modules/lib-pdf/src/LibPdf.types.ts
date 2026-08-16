import type { NativeSyntheticEvent, StyleProp, ViewStyle } from "react-native";

export interface LibPdfViewProps {
  displayMode?: "continuous" | "singlePage";
  onPageChange?: (event: NativeSyntheticEvent<{ pageNumber: number }>) => void;
  pageNumber?: number;
  sourceUri: string;
  style?: StyleProp<ViewStyle>;
}
