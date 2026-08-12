import { useLocalSearchParams } from "expo-router";

import { ChapterEditorScreen } from "~/features/library/screens/chapter-editor-screen";

export default function ChapterEditorRoute() {
  const { id, sectionId } = useLocalSearchParams<{
    id: string;
    sectionId: string;
  }>();
  return <ChapterEditorScreen id={id} sectionId={sectionId} />;
}
