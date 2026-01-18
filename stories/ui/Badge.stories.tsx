/**
 * Badge Component Stories
 *
 * Demonstrates the Badge component for status indicators and labels.
 * Part of the Jetvision Design System.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertTriangle, Plane } from 'lucide-react';

/**
 * Badge is used to highlight status, labels, or counts.
 * Commonly used for flight status, booking states, and category labels.
 */
const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A compact label component for status indicators, counts, and categories.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
      description: 'Badge style variant',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// =============================================================================
// BASIC VARIANTS
// =============================================================================

/** Default badge - Primary color */
export const Default: Story = {
  args: {
    children: 'Confirmed',
  },
};

/** Secondary badge */
export const Secondary: Story = {
  args: {
    children: 'Pending',
    variant: 'secondary',
  },
};

/** Destructive badge for errors/cancelled */
export const Destructive: Story = {
  args: {
    children: 'Cancelled',
    variant: 'destructive',
  },
};

/** Outline badge */
export const Outline: Story = {
  args: {
    children: 'Draft',
    variant: 'outline',
  },
};

// =============================================================================
// WITH ICONS
// =============================================================================

/** Badge with leading icon */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <CheckCircle className="size-3" />
        Confirmed
      </>
    ),
  },
};

/** Status badges with icons */
export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>
        <CheckCircle className="size-3" />
        Confirmed
      </Badge>
      <Badge variant="secondary">
        <Clock className="size-3" />
        Pending
      </Badge>
      <Badge variant="outline">
        <AlertTriangle className="size-3" />
        Review
      </Badge>
      <Badge variant="destructive">
        <XCircle className="size-3" />
        Cancelled
      </Badge>
    </div>
  ),
};

// =============================================================================
// AVIATION-SPECIFIC
// =============================================================================

/** Flight status badges */
export const FlightStatus: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Badge className="bg-green-500 hover:bg-green-500/90">
          <Plane className="size-3" />
          On Time
        </Badge>
        <span className="text-sm text-muted-foreground">Flight departing as scheduled</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge className="bg-yellow-500 hover:bg-yellow-500/90 text-black">
          <Clock className="size-3" />
          Delayed
        </Badge>
        <span className="text-sm text-muted-foreground">30 minute delay</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="destructive">
          <XCircle className="size-3" />
          Cancelled
        </Badge>
        <span className="text-sm text-muted-foreground">Weather conditions</span>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

/** Quote status badges */
export const QuoteStatus: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">Draft</Badge>
      <Badge variant="secondary">Submitted</Badge>
      <Badge>Quoted</Badge>
      <Badge className="bg-green-500 hover:bg-green-500/90">Accepted</Badge>
      <Badge variant="destructive">Declined</Badge>
      <Badge className="bg-gray-500 hover:bg-gray-500/90">Expired</Badge>
    </div>
  ),
};

/** Aircraft category badges */
export const AircraftCategories: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline">Light Jet</Badge>
      <Badge variant="outline">Midsize Jet</Badge>
      <Badge variant="outline">Super Midsize</Badge>
      <Badge variant="outline">Heavy Jet</Badge>
      <Badge variant="outline">Ultra Long Range</Badge>
      <Badge variant="outline">Turboprop</Badge>
    </div>
  ),
};

// =============================================================================
// COUNTS & NUMBERS
// =============================================================================

/** Badge with count */
export const WithCount: Story = {
  args: {
    children: '12',
    variant: 'secondary',
  },
};

/** Notification badges */
export const Notifications: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="relative">
        <span className="text-sm">Messages</span>
        <Badge className="absolute -top-2 -right-4 h-5 w-5 p-0 flex items-center justify-center text-xs">
          3
        </Badge>
      </div>
      <div className="relative">
        <span className="text-sm">Quotes</span>
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-4 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          5
        </Badge>
      </div>
    </div>
  ),
};

// =============================================================================
// ALL VARIANTS
// =============================================================================

/** All badge variants showcase */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Standard Variants</h4>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2">With Icons</h4>
        <div className="flex flex-wrap gap-2">
          <Badge>
            <CheckCircle className="size-3" />
            Success
          </Badge>
          <Badge variant="secondary">
            <Clock className="size-3" />
            Pending
          </Badge>
          <Badge variant="destructive">
            <XCircle className="size-3" />
            Error
          </Badge>
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};
