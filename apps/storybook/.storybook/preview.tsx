import type { Preview } from "@storybook/react";
import { withThemeByDataAttribute } from "@storybook/addon-themes";

import "./globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disable: true,
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "light",
      attributeName: "class",
    }),
    (Story, context) => {
      const themePreset = context.globals.themePreset || "default";
      return (
        <div data-theme-preset={themePreset} className="min-h-screen bg-background p-4">
          <Story />
        </div>
      );
    },
  ],
  globalTypes: {
    themePreset: {
      name: "Theme Preset",
      description: "Select a theme preset",
      defaultValue: "default",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "default", title: "Default" },
          { value: "brutalist", title: "Brutalist" },
          { value: "soft-pop", title: "Soft Pop" },
          { value: "tangerine", title: "Tangerine" },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
