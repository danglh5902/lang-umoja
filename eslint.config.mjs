import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Three Fiber cập nhật camera/vật thể three.js trực tiếp trong useFrame mỗi khung hình —
    // các luật React Compiler dưới đây coi đó là lỗi nên chỉ để ở mức cảnh báo.
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma client sinh tự động
    "src/generated/**",
  ]),
]);

export default eslintConfig;
