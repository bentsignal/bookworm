import { Text, View } from "react-native";

import type { WormPdfViewProps } from "./WormPdf.types";

export default function WormPdfView({ style }: WormPdfViewProps) {
  return (
    <View style={style} className="items-center justify-center px-8">
      <Text className="text-muted-foreground text-center">
        PDF reading is not available on this platform yet.
      </Text>
    </View>
  );
}
