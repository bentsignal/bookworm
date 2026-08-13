import { useLocalSearchParams } from "expo-router";

import { ReaderScreen } from "~/features/library/screens/reader-screen";

export default function ReaderRoute() {
  const { id, scope } = useLocalSearchParams<{
    id: string;
    scope?: "import" | "library";
  }>();
  return <ReaderScreen id={id} scope={scope ?? "library"} />;
}
