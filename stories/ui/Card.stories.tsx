/**
 * Card Component Stories
 *
 * Demonstrates the Card component and its subcomponents.
 * Part of the Jetvision Design System.
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Calendar, MapPin, Users, MoreHorizontal } from 'lucide-react';

/**
 * Card is a container component for grouping related content.
 * It provides consistent styling for surfaces in the Jetvision design system.
 */
const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A versatile container component for grouping related content with consistent styling.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

// =============================================================================
// BASIC EXAMPLES
// =============================================================================

/** Basic card with header and content */
export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Flight Request</CardTitle>
        <CardDescription>
          Submit a new charter flight request
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Fill out the form below to request a quote for your private charter
          flight.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Get Quote</Button>
      </CardFooter>
    </Card>
  ),
};

/** Card with action button in header */
export const WithAction: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Recent Quotes</CardTitle>
        <CardDescription>Your latest flight quote requests</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">NYC → LAX</span>
            <Badge>Pending</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">MIA → LDN</span>
            <Badge variant="secondary">Quoted</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

// =============================================================================
// AVIATION-SPECIFIC CARDS
// =============================================================================

/** Flight booking card with trip details */
export const FlightCard: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <Plane className="size-5 text-primary" />
          <CardTitle>Charter Flight</CardTitle>
        </div>
        <CardDescription>Round Trip • Citation XLS</CardDescription>
        <CardAction>
          <Badge variant="outline" className="text-primary border-primary">
            Confirmed
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Route */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div className="size-2 rounded-full bg-primary" />
              <div className="w-px h-8 bg-border" />
              <div className="size-2 rounded-full bg-accent" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="font-medium">New York (KTEB)</p>
                <p className="text-sm text-muted-foreground">Teterboro Airport</p>
              </div>
              <div>
                <p className="font-medium">Los Angeles (KVNY)</p>
                <p className="text-sm text-muted-foreground">Van Nuys Airport</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">Jan 25, 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Passengers</p>
                <p className="text-sm font-medium">6 PAX</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <div className="flex w-full items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Estimated Price</p>
            <p className="text-lg font-semibold">$42,500</p>
          </div>
          <Button>View Details</Button>
        </div>
      </CardFooter>
    </Card>
  ),
};

/** Quote summary card */
export const QuoteSummary: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle className="text-lg">Quote Summary</CardTitle>
        <CardDescription>RFQ-2026-0125</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Aircraft Charter</span>
            <span>$38,000</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">FBO Fees</span>
            <span>$2,500</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Catering</span>
            <span>$1,200</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxes & Fees</span>
            <span>$800</span>
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">$42,500</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1">
          Decline
        </Button>
        <Button className="flex-1">Accept Quote</Button>
      </CardFooter>
    </Card>
  ),
};

// =============================================================================
// STATES & VARIATIONS
// =============================================================================

/** Interactive card with hover state */
export const Interactive: Story = {
  render: () => (
    <Card className="w-[300px] cursor-pointer transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-base">Available Aircraft</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
            <Plane className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Gulfstream G650</p>
            <p className="text-sm text-muted-foreground">Heavy Jet • 14 PAX</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

/** Compact card for lists */
export const Compact: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <MapPin className="size-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Los Angeles, CA</p>
            <p className="text-xs text-muted-foreground">Van Nuys Airport (KVNY)</p>
          </div>
          <Button variant="ghost" size="sm">
            Select
          </Button>
        </div>
      </CardContent>
    </Card>
  ),
};
