import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      "react": reactPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      // ===== TypeScript rules =====
      // Allow `any` in API routes (Prisma types kadang complex)
      "@typescript-eslint/no-explicit-any": "off",
      // Enforce no-unused-vars (except _-prefixed)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "@typescript-eslint/no-unused-disable-directive": "off",
      // Encourage explicit return types on exported functions
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // ===== React rules =====
      // Defer to careful review for hooks deps (often needs manual adjustment)
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/rules-of-hooks": "error",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      "react-compiler/react-compiler": "off",
      // Encourage self-closing on empty tags
      "react/self-closing-comp": "warn",

      // ===== Next.js rules =====
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",

      // ===== General JavaScript rules =====
      "prefer-const": "warn",
      "no-unused-vars": "off", // handled by TS
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-irregular-whitespace": "warn",
      "no-case-declarations": "warn",
      "no-fallthrough": "warn",
      "no-mixed-spaces-and-tabs": "warn",
      "no-redeclare": "warn",
      "no-undef": "off", // handled by TS
      "no-unreachable": "error",
      "no-useless-escape": "warn",
      // Use === over ==
      "eqeqeq": ["error", "always", { null: "ignore" }],
    },
  },
  {
    // ===== File-specific overrides =====
    files: ["src/app/api/**/*.ts", "src/lib/**/*.ts"],
    rules: {
      // Allow console.warn/error in server code (logging)
      "no-console": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "tests/**/*.ts"],
    rules: {
      // Tests boleh pakai any
      "@typescript-eslint/no-explicit-any": "off",
      // Tests boleh console.log
      "no-console": "off",
      // Tests boleh empty functions
      "no-empty-function": "off",
    },
  },
  {
    files: ["scripts/**/*.{ts,js,mjs,sh}"],
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "examples/**",
      "skills/**",
      ".github/**", // GitHub-specific files
      "coverage/**",
      "**/*.config.{js,ts,mjs}",
    ],
  },
];

export default eslintConfig;
