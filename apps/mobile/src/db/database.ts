import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

import * as schema from "./schema";

export const sqlite = openDatabaseSync("lib.db", {
  enableChangeListener: true,
});

sqlite.execSync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
