import { useLocalSearchParams } from "expo-router";

import { BookScreen } from "~/features/library/screens/book-screen";

export default function BookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BookScreen id={id} />;
}
