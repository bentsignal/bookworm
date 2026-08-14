import { ActivityIndicator, Text, View } from "react-native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { useColor } from "~/hooks/use-color";
import { db } from "./database";
import migrations from "./migrations";

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const primary = useColor("primary");
  const migration = useMigrations(db, migrations);

  const error = migration.error;
  if (error) {
    return (
      <View className="bg-background flex-1 items-center justify-center px-8">
        <Text className="text-foreground text-center text-base font-semibold">
          Couldn’t open your library
        </Text>
        <Text className="text-muted-foreground mt-2 text-center text-sm">
          {error.message}
        </Text>
      </View>
    );
  }
  if (!migration.success) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator color={primary} />
      </View>
    );
  }
  return children;
}
