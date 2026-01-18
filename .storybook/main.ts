/**
 * Storybook Main Configuration
 *
 * Configures Storybook for the Jetvision component library.
 * Uses Vite builder for fast HMR and integrates with Tailwind CSS v4.
 */

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // Story file patterns
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],

  // Storybook addons
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-links',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],

  // Framework configuration
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  // Documentation configuration
  docs: {},

  // Vite configuration overrides
  viteFinal: async (config) => {
    // Add path aliases to match Next.js tsconfig
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': new URL('..', import.meta.url).pathname,
    };

    // Ensure CSS is processed correctly
    config.css = config.css || {};
    config.css.postcss = new URL('../postcss.config.mjs', import.meta.url).pathname;

    return config;
  },

  // TypeScript configuration
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
