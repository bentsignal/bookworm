import { defineConfig } from "eslint/config";

import { baseConfig, strictConfig } from "@lib/eslint-config/base";
import { createStrictSyntax } from "@lib/eslint-config/syntax";

export default defineConfig(
  baseConfig,
  strictConfig,
  createStrictSyntax({ ts: true }),
);
