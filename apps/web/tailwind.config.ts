import type { Config } from 'tailwindcss';
import sharedPreset from '../../packages/shared/src/tailwind/preset.ts';

const config: Config = {
  presets: [sharedPreset as Config],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/src/ui/**/*.{js,ts,jsx,tsx}'
  ]
};

export default config;
