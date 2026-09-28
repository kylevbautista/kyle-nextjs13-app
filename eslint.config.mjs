import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  globalIgnores([".next/**", "node_modules/**", "_bmad/**", "_bmad-output/**", "docs/**"]),
  { extends: [...nextCoreWebVitals] },
]);
