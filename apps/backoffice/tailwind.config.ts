import type { Config } from 'tailwindcss';
import sharedPreset from '../../packages/shared/src/tailwind/preset.ts';

const config: Config = {
  presets: [sharedPreset as Config],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/src/ui/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          'active-bg': 'var(--sidebar-active-bg)',
          'active-text': 'var(--sidebar-active-text)'
        },
        table: {
          'col-blue': 'var(--table-col-blue)',
          'col-cyan': 'var(--table-col-cyan)',
          'col-pink': 'var(--table-col-pink)'
        },
        gradient: {
          start: 'var(--gradient-start)',
          middle: 'var(--gradient-middle)',
          end: 'var(--gradient-end)'
        }
      },
      backgroundImage: {
        'gradient-zaant': 'linear-gradient(to right, var(--gradient-start), var(--gradient-middle), var(--gradient-end))'
      }
    }
  }
};

export default config;
