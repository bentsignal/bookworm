import { useLocalSearchParams } from "expo-router";

import { ChapterEditorScreen } from "~/features/library/screens/chapter-editor-screen";

export default function ChapterEditorRoute() {
  const { id, scope, sectionId } = useLocalSearchParams<{
    id: string;
    scope?: "import" | "library";
    sectionId: string;
  }>();
  return (
    <ChapterEditorScreen
      id={id}
      scope={scope ?? "library"}
      sectionId={sectionId}
    />
  );
}
