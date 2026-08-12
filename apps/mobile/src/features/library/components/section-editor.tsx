import { ActionSheetIOS, Pressable, Text, View } from "react-native";

import type { BookFormat, BookSection, EpubLocation } from "@worm/ebook-core";
import { sectionLocationRange } from "@worm/ebook-core";

export function SectionEditor({
  format,
  locations = [],
  onDelete,
  onEdit,
  onToggleIncluded,
  sections,
}: {
  format: BookFormat;
  locations?: EpubLocation[];
  onDelete: (section: BookSection) => void;
  onEdit: (section: BookSection) => void;
  onToggleIncluded: (section: BookSection) => void;
  sections: BookSection[];
}) {
  return (
    <View className="border-border overflow-hidden rounded-2xl border">
      {sections.map((section, index) => (
        <Pressable
          accessibilityLabel={`Edit ${section.title}`}
          accessibilityRole="button"
          className={`bg-card flex-row items-center gap-3 px-4 py-4 active:opacity-70 ${index > 0 ? "border-border border-t" : ""}`}
          key={section.id}
          onPress={() => onEdit(section)}
        >
          <Text className="text-muted-foreground w-5 text-xs tabular-nums">
            {index + 1}
          </Text>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text
                className="text-foreground min-w-0 flex-shrink text-[15px] font-semibold"
                numberOfLines={1}
              >
                {section.title}
              </Text>
              <InclusionStatus included={section.included} />
            </View>
            <Text
              className="text-muted-foreground mt-1 text-xs"
              numberOfLines={2}
            >
              {sectionDescription(section, format, locations)}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={`Chapter actions for ${section.title}`}
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center"
            hitSlop={8}
            onPress={() =>
              showSectionActions(section, onDelete, onEdit, onToggleIncluded)
            }
          >
            <Text className="text-primary text-2xl leading-6">•••</Text>
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

function InclusionStatus({ included }: { included: boolean }) {
  if (included) return null;
  return (
    <View className="bg-muted rounded-full px-2 py-0.5">
      <Text className="text-muted-foreground text-[10px] font-semibold uppercase">
        Excluded
      </Text>
    </View>
  );
}

function showSectionActions(
  section: BookSection,
  onDelete: (section: BookSection) => void,
  onEdit: (section: BookSection) => void,
  onToggleIncluded: (section: BookSection) => void,
) {
  const inclusionAction = section.included
    ? "Exclude from edition"
    : "Include in edition";
  ActionSheetIOS.showActionSheetWithOptions(
    {
      cancelButtonIndex: 3,
      destructiveButtonIndex: 2,
      options: ["Edit chapter", inclusionAction, "Delete chapter", "Cancel"],
      title: section.title,
    },
    (index) => {
      if (index === 0) onEdit(section);
      if (index === 1) onToggleIncluded(section);
      if (index === 2) onDelete(section);
    },
  );
}

function sectionDescription(
  section: BookSection,
  format: BookFormat,
  locations: EpubLocation[],
) {
  if (format === "pdf") {
    const start = section.startPage ?? 1;
    const end = section.endPage ?? start;
    return start === end ? `Page ${start}` : `Pages ${start}–${end}`;
  }
  const range = sectionLocationRange(section, locations);
  const first = locations[range.start];
  const last = locations[range.end];
  if (!first) return "Text unavailable";
  if (range.start === range.end) {
    return `Text ${range.start + 1} · ${first.title}`;
  }
  return `Text ${range.start + 1}–${range.end + 1} · ${first.title} to ${last?.title ?? "end"}`;
}
