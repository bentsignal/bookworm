import { defineConfig } from "eslint/config";

import { baseConfig, strictConfig } from "@worm/eslint-config/base";
import { reactConfig } from "@worm/eslint-config/react";
import { createStrictSyntax } from "@worm/eslint-config/syntax";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  baseConfig,
  reactConfig,
  strictConfig,
  createStrictSyntax({ ts: true, react: true, mobile: true }),
);
