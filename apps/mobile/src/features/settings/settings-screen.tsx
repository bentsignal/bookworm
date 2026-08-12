import { ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";

export function SettingsScreen() {
  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="px-5 pt-5"
    >
      <Stack.Screen options={{ headerLargeTitle: true, title: "Settings" }} />
      <Text className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
        Storage
      </Text>
      <View className="border-border bg-card rounded-2xl border px-4 py-4">
        <View className="flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className="text-foreground text-[16px] font-semibold">
              Files access
            </Text>
            <Text className="text-muted-foreground mt-1 text-sm leading-5">
              On My iPhone › bookworm › Library
            </Text>
          </View>
          <View className="bg-primary h-2.5 w-2.5 rounded-full" />
        </View>
      </View>
      <Text className="text-muted-foreground mt-3 px-1 text-sm leading-5">
        Originals and generated editions stay visible in Files. bookworm never
        overwrites an original.
      </Text>
      <Text className="text-muted-foreground mt-10 text-center text-xs">
        bookworm 0.1.0
      </Text>
    </ScrollView>
  );
}
