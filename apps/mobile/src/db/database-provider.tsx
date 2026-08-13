import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { loadLibrary } from "~/features/library/library-storage";
import { useColor } from "~/hooks/use-color";
import { migrateLegacyBooks } from "./catalog";
import { db } from "./database";
import migrations from "./migrations/migrations";

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const primary = useColor("primary");
  const migration = useMigrations(db, migrations);
  const [legacyReady, setLegacyReady] = useState(false);
  const [legacyError, setLegacyError] = useState<Error>();

  // eslint-disable-next-line no-restricted-syntax -- Legacy Files data is migrated only after the external SQLite migration hook completes.
  useEffect(() => {
    if (!migration.success) return;
    let cancelled = false;
    void loadLibrary()
      .then(migrateLegacyBooks)
      .then(() => {
        if (!cancelled) setLegacyReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLegacyError(
            error instanceof Error
              ? error
              : new Error("Database setup failed."),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [migration.success]);

  const error = migration.error ?? legacyError;
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
  if (!migration.success || !legacyReady) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator color={primary} />
      </View>
    );
  }
  return children;
}
