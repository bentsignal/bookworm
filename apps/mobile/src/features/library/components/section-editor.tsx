import { Pressable, Switch, Text, TextInput, View } from "react-native";

import type { BookSection } from "@worm/ebook-core";

export function SectionEditor({
  editable = true,
  onChange,
  onMove,
  sections,
}: {
  editable?: boolean;
  onChange: (section: BookSection) => void;
  onMove: (id: string, direction: -1 | 1) => void;
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
            <Text className="text-muted-foreground mt-0.5 text-xs">
              {pageRange(section)}
            </Text>
          </View>
          <SectionControls
            editable={editable}
            first={index === 0}
            last={index === sections.length - 1}
            onChange={onChange}
            onMove={onMove}
            section={section}
          />
        </View>
      ))}
    </View>
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

function SectionControls({
  editable,
  first,
  last,
  onChange,
  onMove,
  section,
}: {
  editable: boolean;
  first: boolean;
  last: boolean;
  onChange: (section: BookSection) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  section: BookSection;
}) {
  if (!editable) return null;
  return (
    <>
      <View className="flex-row">
        <MoveButton
          disabled={first}
          label="Move up"
          symbol="↑"
          onPress={() => onMove(section.id, -1)}
        />
        <MoveButton
          disabled={last}
          label="Move down"
          symbol="↓"
          onPress={() => onMove(section.id, 1)}
        />
      </View>
      <Switch
        onValueChange={(included) => onChange({ ...section, included })}
        value={section.included}
      />
    </>
  );
}

function MoveButton({
  disabled,
  label,
  onPress,
  symbol,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  symbol: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      className="h-10 w-8 items-center justify-center"
      disabled={disabled}
      onPress={onPress}
      style={{ opacity: disabled ? 0.22 : 1 }}
    >
      <Text className="text-primary text-xl">{symbol}</Text>
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
