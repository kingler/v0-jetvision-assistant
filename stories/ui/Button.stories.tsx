/**
 * Button Component Stories
 *
 * Demonstrates all variants, sizes, and states of the Button component.
 * Part of the Jetvision Design System.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { Plane, Send, Download, Loader2, Plus, Trash2 } from 'lucide-react';

/**
 * The Button component is the primary interactive element in the Jetvision design system.
 * It supports multiple variants and sizes to accommodate different use cases.
 *
 * ## Design Tokens
 * - Primary: Sky Blue (#00a8e8)
 * - Accent: Sunset Orange (#ff6b35)
 * - Destructive: Error Red
 */
const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A versatile button component with multiple variants and sizes, following the Jetvision design system.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'secondary',
        'accent',
        'destructive',
        'outline',
        'ghost',
        'link',
      ],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl', 'icon', 'icon-sm', 'icon-lg'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    asChild: {
      control: 'boolean',
      description: 'Render as child component (for composition)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// =============================================================================
// VARIANT STORIES
// =============================================================================

/** Primary button using Sky Blue - the default call-to-action */
export const Default: Story = {
  args: {
    children: 'Book Flight',
    variant: 'default',
  },
};

/** Secondary button - text link style for secondary actions */
export const Secondary: Story = {
  args: {
    children: 'View Details',
    variant: 'secondary',
  },
};

/** Accent button using Sunset Orange - for premium/highlighted actions */
export const Accent: Story = {
  args: {
    children: 'Premium Quote',
    variant: 'accent',
  },
};

/** Destructive button for dangerous actions */
export const Destructive: Story = {
  args: {
    children: 'Cancel Booking',
    variant: 'destructive',
  },
};

/** Outline button with border */
export const Outline: Story = {
  args: {
    children: 'Filter Results',
    variant: 'outline',
  },
};

/** Ghost button for subtle actions */
export const Ghost: Story = {
  args: {
    children: 'More Options',
    variant: 'ghost',
  },
};

/** Link button styled as a text link */
export const Link: Story = {
  args: {
    children: 'Learn More',
    variant: 'link',
  },
};

// =============================================================================
// SIZE STORIES
// =============================================================================

/** Small button for compact UIs */
export const Small: Story = {
  args: {
    children: 'Small',
    size: 'sm',
  },
};

/** Large button for emphasis */
export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

/** Extra large button for hero sections */
export const ExtraLarge: Story = {
  args: {
    children: 'Get Started Now',
    size: 'xl',
  },
};

// =============================================================================
// WITH ICONS
// =============================================================================

/** Button with leading icon */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plane className="size-4" />
        Book Flight
      </>
    ),
  },
};

/** Button with trailing icon */
export const WithTrailingIcon: Story = {
  args: {
    children: (
      <>
        Send Quote
        <Send className="size-4" />
      </>
    ),
  },
};

/** Icon-only button */
export const IconOnly: Story = {
  args: {
    children: <Plus className="size-4" />,
    size: 'icon',
    'aria-label': 'Add new',
  },
};

/** Small icon button */
export const IconSmall: Story = {
  args: {
    children: <Trash2 className="size-4" />,
    size: 'icon-sm',
    variant: 'ghost',
    'aria-label': 'Delete',
  },
};

// =============================================================================
// STATES
// =============================================================================

/** Loading state with spinner */
export const Loading: Story = {
  args: {
    children: (
      <>
        <Loader2 className="size-4 animate-spin" />
        Processing...
      </>
    ),
    disabled: true,
  },
};

/** Disabled button */
export const Disabled: Story = {
  args: {
    children: 'Unavailable',
    disabled: true,
  },
};

// =============================================================================
// ALL VARIANTS SHOWCASE
// =============================================================================

/** Showcase of all button variants */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="xl">Extra Large</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-sm">
          <Plus className="size-4" />
        </Button>
        <Button size="icon">
          <Plus className="size-4" />
        </Button>
        <Button size="icon-lg">
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};
