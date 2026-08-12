import { Pressable, Switch, Text, TextInput, View } from "react-native";

import type { BookSection } from "@worm/ebook-core";

export function SectionEditor({
  editable = true,
  onChange,
  onEditRange,
  sections,
}: {
  editable?: boolean;
  onChange: (section: BookSection) => void;
  onEditRange?: (section: BookSection) => void;
  sections: BookSection[];
}) {
  return (
    <View className="border-border overflow-hidden rounded-2xl border">
      {sections.map((section, index) => (
        <View
          className={`bg-card flex-row items-center gap-3 px-4 py-3 ${index > 0 ? "border-border border-t" : ""}`}
          key={section.id}
        >
          <Text className="text-muted-foreground w-5 text-xs tabular-nums">
            {index + 1}
          </Text>
          <View className="min-w-0 flex-1">
            <SectionTitle
              editable={editable}
              onChange={onChange}
              section={section}
            />
            <SectionRange onEdit={onEditRange} section={section} />
          </View>
          <SectionInclusion
            editable={editable}
            onChange={onChange}
            section={section}
          />
        </View>
      ))}
    </View>
  );
}

function SectionInclusion({
  editable,
  onChange,
  section,
}: {
  editable: boolean;
  onChange: (section: BookSection) => void;
  section: BookSection;
}) {
  if (!editable) return null;
  return (
    <Switch
      onValueChange={(included) => onChange({ ...section, included })}
      value={section.included}
    />
  );
}

function SectionTitle({
  editable,
  onChange,
  section,
}: {
  editable: boolean;
  onChange: (section: BookSection) => void;
  section: BookSection;
}) {
  if (!editable) {
    return (
      <Text className="text-foreground text-[15px] font-medium">
        {section.title}
      </Text>
    );
  }
  return (
    <TextInput
      className="text-foreground p-0 text-[15px] font-medium"
      onChangeText={(title) => onChange({ ...section, title })}
      placeholder="Untitled section"
      defaultValue={section.title}
    />
  );
}

function SectionRange({
  onEdit,
  section,
}: {
  onEdit: ((section: BookSection) => void) | undefined;
  section: BookSection;
}) {
  const label = pageRange(section);
  if (!onEdit || section.startPage === undefined) {
    return (
      <Text className="text-muted-foreground mt-0.5 text-xs">{label}</Text>
    );
  }
  return (
    <Pressable
      accessibilityLabel={`Edit ${label}`}
      accessibilityRole="button"
      className="mt-0.5 self-start py-1"
      onPress={() => onEdit(section)}
    >
      <Text className="text-primary text-xs font-medium">{label}</Text>
    </Pressable>
  );
}

function pageRange(section: BookSection) {
  if (section.startPage === undefined || section.endPage === undefined) {
    return "EPUB chapter";
  }
  if (section.startPage === section.endPage) return `Page ${section.startPage}`;
  return `Pages ${section.startPage}–${section.endPage}`;
}
