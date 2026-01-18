/**
 * Storybook Manager Configuration
 *
 * Customizes the Storybook UI (sidebar, toolbar, etc.)
 * with Jetvision branding.
 */

import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

// Create custom theme with Jetvision branding
const jetvisionTheme = create({
  base: 'light',

  // Brand
  brandTitle: 'Jetvision Component Library',
  brandUrl: '/',
  brandTarget: '_self',

  // Colors - Sky Blue primary
  colorPrimary: '#00a8e8',
  colorSecondary: '#0087ba',

  // UI
  appBg: '#f9fafb',
  appContentBg: '#ffffff',
  appBorderColor: '#e5e7eb',
  appBorderRadius: 8,

  // Text colors
  textColor: '#374151',
  textInverseColor: '#ffffff',
  textMutedColor: '#6b7280',

  // Toolbar
  barTextColor: '#6b7280',
  barSelectedColor: '#00a8e8',
  barBg: '#ffffff',
  barHoverColor: '#00a8e8',

  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#e5e7eb',
  inputTextColor: '#374151',
  inputBorderRadius: 6,

  // Font
  fontBase: 'Arial, sans-serif',
  fontCode: '"Courier New", monospace',
});

addons.setConfig({
  theme: jetvisionTheme,
  sidebar: {
    showRoots: true,
    collapsedRoots: ['other'],
  },
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
});
