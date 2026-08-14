import { useLocalSearchParams } from "expo-router";

import { BookScreen } from "~/features/library/screens/book-screen";

export default function BookEditRoute() {
  const { id, scope } = useLocalSearchParams<{
    id: string;
    scope?: "import" | "library";
  }>();
  return <BookScreen id={id} scope={scope ?? "library"} />;
}
