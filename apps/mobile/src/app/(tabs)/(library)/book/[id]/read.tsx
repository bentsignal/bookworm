import { useLocalSearchParams } from "expo-router";

import { ReaderScreen } from "~/features/library/screens/reader-screen";

export default function ReaderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ReaderScreen id={id} />;
}
