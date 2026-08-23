/**
 * Storybook configuration.
 *
 * Foundation untuk visual documentation & testing komponen.
 * Install Storybook via:
 *
 *   bunx storybook@latest init --type nextjs
 *
 * Setelah init, merge config ini ke .storybook/main.ts yang di-generate.
 *
 * Sprint 4 — Visual testing untuk komponen Sprint 1-4.
 */

import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: [
    "../stories/**/*.stories.@(ts|tsx|mdx)",
    "../src/**/*.stories.@(ts|tsx|mdx)",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: "react-docgen-typescript",
  },
  docs: {
    autodocs: "tag",
  },
  staticDirs: ["../public"],
};

export default config;
