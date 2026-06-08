import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare/OpenNext 빌드 산출물 + 생성 파일
    ".open-next/**",
    ".wrangler/**",
    "src/data/content.generated.ts",
    "src/data/ewords.ts",
  ]),
]);

export default eslintConfig;
