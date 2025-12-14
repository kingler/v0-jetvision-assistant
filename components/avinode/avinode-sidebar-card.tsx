import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';

interface QuickAction {
  label: string;
  onClick: () => void;
}

interface QuoteInfo {
  price: {
    amount: number;
    currency: string;
  };
  operator: string;
  aircraft: string;
}

export interface AvinodeSidebarCardProps {
  tripId: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  route: string;
  date: string;
  passengers: number;
  primaryAction?: {
    label: string;
    href: string;
  };
  quote?: QuoteInfo;
  quickActions?: QuickAction[];
  lastUpdated: string;
}

export function AvinodeSidebarCard({
  tripId,
  status,
  route,
  date,
  passengers,
  primaryAction,
  quote,
  quickActions,
  lastUpdated,
}: AvinodeSidebarCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'pending':
        return '🟡';
      case 'completed':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '📌';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active Trip';
      case 'pending':
        return 'Pending Confirmation';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plane className="h-4 w-4" />
            Flight Request
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span>{getStatusIcon(status)}</span>
          <span className="font-medium text-sm">{getStatusLabel(status)}</span>
        </div>

        {/* Trip Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trip ID:</span>
            <span className="font-medium">{tripId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Route:</span>
            <span className="font-medium">{route}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Passengers:</span>
            <span className="font-medium">{passengers}</span>
          </div>
        </div>

        {/* Quote Section (Stage 2) */}
        {quote && (
          <>
            <div className="border-t pt-3" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">💵 Quote</span>
              </div>
              <div className="rounded-lg border p-3 text-center space-y-1">
                <div className="text-lg font-bold text-primary">
                  {formatPrice(quote.price.amount, quote.price.currency)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {quote.operator} • {quote.aircraft}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Primary Action (Stage 1) */}
        {primaryAction && !quote && (
          <a
            href={primaryAction.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full"
          >
            <Button variant="default" className="w-full text-sm">
              🔍 {primaryAction.label}
            </Button>
          </a>
        )}

        {/* Quick Actions (Stage 2) */}
        {quickActions && quickActions.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-2">Quick Actions</div>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={action.onClick}
                  className="text-xs h-auto py-2 px-2"
                >
                  <span className="whitespace-normal text-center leading-tight">
                    {action.label}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Last updated: {lastUpdated}
        </div>
      </CardContent>
    </Card>
  );
}
