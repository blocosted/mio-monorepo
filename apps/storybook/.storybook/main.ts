import type { StorybookConfig } from "@storybook/react-vite";
import { resolve } from "path";

const config: StorybookConfig = {
  stories: [
    "../../../packages/shared/src/ui/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../../../apps/admin/src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
    "@storybook/addon-links",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: async (config) => {
    const monorepoRoot = resolve(__dirname, "../../..");

    config.resolve = config.resolve || {};

    // Dedupe React to prevent multiple instances
    config.resolve.dedupe = [
      ...(config.resolve.dedupe || []),
      "react",
      "react-dom",
    ];

    config.resolve.alias = {
      ...config.resolve.alias,
      "@mio/ui": resolve(monorepoRoot, "packages/shared/src/ui"),
      "@mio/shared": resolve(monorepoRoot, "packages/shared/src"),
      // App-specific aliases (prefixed to avoid conflicts)
      "@admin": resolve(monorepoRoot, "apps/admin/src"),
      "@admin/lib/utils": resolve(__dirname, "mocks/admin-utils.ts"),
      "@web": resolve(monorepoRoot, "apps/web/src"),
      // Next.js mocks for Storybook
      "next/navigation": resolve(__dirname, "mocks/next-navigation.ts"),
      // Force single React instance
      "react": resolve(monorepoRoot, "node_modules/react"),
      "react-dom": resolve(monorepoRoot, "node_modules/react-dom"),
    };

    // Pre-bundle dependencies that use React hooks to avoid context issues
    config.optimizeDeps = config.optimizeDeps || {};
    config.optimizeDeps.include = [
      ...(config.optimizeDeps.include || []),
      "react",
      "react-dom",
      "recharts",
      "sonner",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-tabs",
      "@radix-ui/react-select",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-switch",
      "@radix-ui/react-slider",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-accordion",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "vaul",
      "cmdk",
      "embla-carousel-react",
      "react-day-picker",
      "react-hook-form",
      "react-resizable-panels",
      "input-otp",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/modifiers",
      "@tanstack/react-table",
      "@tanstack/react-virtual",
      "@tanstack/react-query",
    ];

    // Allow access via Traefik reverse proxy
    config.server = config.server || {};
    config.server.allowedHosts = ["storybook.mio.local", "localhost"];

    return config;
  },
};

export default config;
