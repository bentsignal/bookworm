import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host, HStack, List, RNHostView } from "@expo/ui/swift-ui";
import {
  environment,
  listRowInsets,
  listStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";

import type { BookSection } from "@worm/ebook-core";
import { removeSections, reorderSections } from "@worm/ebook-core";

import type { SectionOrganizerProps } from "./section-organizer.types";

export function SectionOrganizer({
  onChange,
  sections,
}: SectionOrganizerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const insets = useSafeAreaInsets();

  function handleMove(sourceIndices: number[], destination: number) {
    deferChange(
      onChange,
      reorderSections(sections, sourceIndices, destination),
    );
  }

  function handleDelete(indices: number[]) {
    if (indices.length >= sections.length) {
      Alert.alert("Keep one section", "A book needs at least one section.");
      return;
    }
    deferChange(onChange, removeSections(sections, indices));
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Organize sections"
        accessibilityRole="button"
        onPress={() => setIsVisible(true)}
      >
        <Text className="text-primary text-[15px] font-semibold">Organize</Text>
      </Pressable>
      <Modal
        animationType="slide"
        presentationStyle="fullScreen"
        visible={isVisible}
        onRequestClose={() => setIsVisible(false)}
      >
        <View
          className="bg-background flex-1"
          style={{ paddingBottom: insets.bottom, paddingTop: insets.top }}
        >
          <OrganizerHeader onDone={() => setIsVisible(false)} />
          <Host style={{ flex: 1 }}>
            <List
              modifiers={[
                environment("editMode", "active"),
                listStyle("insetGrouped"),
              ]}
            >
              <List.ForEach onDelete={handleDelete} onMove={handleMove}>
                {sections.map((section, index) => (
                  <HStack
                    key={section.id}
                    modifiers={[
                      tag(section.id),
                      listRowInsets({
                        bottom: 8,
                        leading: 16,
                        top: 8,
                        trailing: 16,
                      }),
                    ]}
                  >
                    <RNHostView matchContents>
                      <NativeSectionRow index={index} section={section} />
                    </RNHostView>
                  </HStack>
                ))}
              </List.ForEach>
            </List>
          </Host>
        </View>
      </Modal>
    </>
  );
}

function OrganizerHeader({ onDone }: { onDone: () => void }) {
  return (
    <View className="border-border h-14 flex-row items-center justify-between border-b px-4">
      <View className="w-14" />
      <Text className="text-foreground text-base font-semibold">
        Organize Sections
      </Text>
      <Pressable
        accessibilityLabel="Done organizing sections"
        accessibilityRole="button"
        className="min-h-10 min-w-14 items-end justify-center"
        onPress={onDone}
      >
        <Text className="text-primary text-base font-semibold">Done</Text>
      </Pressable>
    </View>
  );
}

function NativeSectionRow({
  index,
  section,
}: {
  index: number;
  section: BookSection;
}) {
  const { width } = useWindowDimensions();
  return (
    <View
      className="h-14 flex-row items-center gap-3 pl-2"
      style={{ width: Math.max(width - 112, 220) }}
    >
      <Text className="text-muted-foreground w-5 text-xs tabular-nums">
        {index + 1}
      </Text>
      <View className="min-w-0 flex-1">
        <Text
          className="text-foreground text-[15px] font-semibold"
          numberOfLines={1}
        >
          {section.title}
        </Text>
        <Text
          className="text-muted-foreground mt-0.5 text-xs"
          numberOfLines={1}
        >
          {sectionDescription(section)}
        </Text>
      </View>
    </View>
  );
}

function sectionDescription(section: BookSection) {
  if (section.startPage === undefined || section.endPage === undefined) {
    return section.included ? "Included" : "Not included";
  }
  const range =
    section.startPage === section.endPage
      ? `Page ${section.startPage}`
      : `Pages ${section.startPage}–${section.endPage}`;
  return section.included ? range : `${range} · Not included`;
}

function deferChange(
  onChange: (sections: BookSection[]) => void,
  sections: BookSection[],
) {
  setTimeout(() => onChange(sections), 0);
}
