import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Feature-based architecture guardrail: UI inside a feature must not reach
  // Supabase directly — data access goes through the feature's data/ (reads)
  // or actions/ (mutations). Scoped to migrated features only for now; widen
  // this glob as each feature moves under src/features/.
  {
    files: ["src/features/*/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/*", "**/lib/supabase/*"],
              message:
                "UI components must not import Supabase clients. Use the feature's data/ (server reads) or actions/ (Server Actions) instead.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
