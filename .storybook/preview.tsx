/**
 * Storybook Preview Configuration
 *
 * Configures global decorators, parameters, and theme support
 * for the Jetvision component library.
 */

import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import React from 'react';

// Import global styles (Tailwind CSS)
import '../app/globals.css';

/**
 * Theme Provider Decorator
 *
 * Wraps stories with theme context support for light/dark mode switching.
 */
const ThemeDecorator = (Story: React.ComponentType) => (
  <div className="font-sans antialiased">
    <Story />
  </div>
);

const preview: Preview = {
  parameters: {
    // Action handlers for events
    actions: { argTypesRegex: '^on[A-Z].*' },

    // Controls configuration
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // Background options
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0a0a0a' },
        { name: 'card', value: '#fafafa' },
      ],
    },

    // Viewport presets
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
        },
        wide: {
          name: 'Wide',
          styles: { width: '1536px', height: '900px' },
        },
      },
    },

    // Layout configuration
    layout: 'centered',

    // Documentation options
    docs: {
      toc: true,
    },
  },

  // Global decorators
  decorators: [
    ThemeDecorator,
    // Theme switching decorator via addon-themes
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],

  // Global arg types
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },

  // Tags for auto-docs
  tags: ['autodocs'],
};

export default preview;
