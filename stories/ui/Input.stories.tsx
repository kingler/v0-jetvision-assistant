/**
 * Input Component Stories
 *
 * Demonstrates the Input component with various states and use cases.
 * Part of the Jetvision Design System.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Mail, Lock, Plane, Calendar } from 'lucide-react';

/**
 * Input is a form element for capturing user text input.
 * Styled to match the Jetvision design system with proper focus states.
 */
const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A styled text input component with support for various input types and states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'number', 'tel', 'url'],
      description: 'Input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// =============================================================================
// BASIC EXAMPLES
// =============================================================================

/** Default text input */
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

/** Input with label */
export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="you@example.com" />
    </div>
  ),
};

/** Input with helper text */
export const WithHelperText: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="passengers">Number of Passengers</Label>
      <Input type="number" id="passengers" placeholder="1" min={1} max={20} />
      <p className="text-sm text-muted-foreground">
        Maximum capacity depends on aircraft type
      </p>
    </div>
  ),
};

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Email input */
export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'you@example.com',
  },
};

/** Password input */
export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
};

/** Search input */
export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search flights...',
  },
};

/** Number input */
export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
    min: 0,
  },
};

// =============================================================================
// WITH ICONS
// =============================================================================

/** Input with leading icon */
export const WithLeadingIcon: Story = {
  render: () => (
    <div className="relative w-full max-w-sm">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input className="pl-10" placeholder="Search destinations..." />
    </div>
  ),
};

/** Input with trailing icon */
export const WithTrailingIcon: Story = {
  render: () => (
    <div className="relative w-full max-w-sm">
      <Input className="pr-10" placeholder="Select date" />
      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
    </div>
  ),
};

/** Input with both icons */
export const WithBothIcons: Story = {
  render: () => (
    <div className="relative w-full max-w-sm">
      <Plane className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input className="px-10" placeholder="Enter airport code" />
      <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
    </div>
  ),
};

// =============================================================================
// STATES
// =============================================================================

/** Disabled input */
export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

/** Input with error state */
export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="error-email" className="text-destructive">
        Email
      </Label>
      <Input
        type="email"
        id="error-email"
        placeholder="you@example.com"
        className="border-destructive focus-visible:ring-destructive"
        aria-invalid="true"
      />
      <p className="text-sm text-destructive">Please enter a valid email address</p>
    </div>
  ),
};

/** Read-only input */
export const ReadOnly: Story = {
  args: {
    value: 'Read-only value',
    readOnly: true,
  },
};

// =============================================================================
// FORM EXAMPLES
// =============================================================================

/** Login form example */
export const LoginForm: Story = {
  render: () => (
    <div className="w-full max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="email"
            id="login-email"
            className="pl-10"
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="password"
            id="login-password"
            className="pl-10"
            placeholder="Enter password"
          />
        </div>
      </div>
      <Button className="w-full">Sign In</Button>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

/** Search with button */
export const SearchWithButton: Story = {
  render: () => (
    <div className="flex w-full max-w-md gap-2">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input className="pl-10" placeholder="Search flights, routes, or aircraft..." />
      </div>
      <Button>Search</Button>
    </div>
  ),
};
