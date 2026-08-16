import { defineConfig } from "eslint/config";

import { baseConfig, strictConfig } from "@lib/eslint-config/base";
import { reactConfig } from "@lib/eslint-config/react";
import { createStrictSyntax } from "@lib/eslint-config/syntax";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**", "src/db/migrations/**"],
  },
  baseConfig,
  reactConfig,
  strictConfig,
  createStrictSyntax({ ts: true, react: true, mobile: true }),
);
