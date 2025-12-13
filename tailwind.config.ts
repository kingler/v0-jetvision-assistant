import type { Config } from 'tailwindcss';
import { getTailwindTheme } from './lib/design-system';

/**
 * Tailwind CSS Configuration
 *
 * This configuration extends Tailwind with Jetvision design system tokens.
 * The theme values are generated from lib/design-system/tokens.ts
 *
 * Available custom utilities:
 * - Colors: bg-aviation-blue-*, text-sky-blue-*, border-sunset-orange-*
 * - Semantic: bg-success, bg-warning, bg-error, bg-info
 * - Shadows: shadow-primary, shadow-accent
 * - Z-index: z-dropdown, z-modal, z-tooltip
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: getTailwindTheme(),
  },
  plugins: [],
};

export default config;
