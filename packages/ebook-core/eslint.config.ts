import { defineConfig } from "eslint/config";

import { baseConfig, strictConfig } from "@worm/eslint-config/base";
import { createStrictSyntax } from "@worm/eslint-config/syntax";

export default defineConfig(
  baseConfig,
  strictConfig,
  createStrictSyntax({ ts: true }),
);
