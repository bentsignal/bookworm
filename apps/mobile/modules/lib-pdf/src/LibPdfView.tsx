import { Text, View } from "react-native";

import type { LibPdfViewProps } from "./LibPdf.types";

export default function LibPdfView({ style }: LibPdfViewProps) {
  return (
    <View style={style} className="items-center justify-center px-8">
      <Text className="text-muted-foreground text-center">
        PDF reading is not available on this platform yet.
      </Text>
    </View>
  );
}
