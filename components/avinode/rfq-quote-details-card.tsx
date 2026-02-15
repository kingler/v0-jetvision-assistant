import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Building2, Plane, DollarSign, Clock, MapPin, CheckCircle2 } from 'lucide-react';

export interface RfqQuoteDetailsCardProps {
  rfqId: string;
  quoteId: string;
  operator: {
    name: string;
    rating?: number;
  };
  aircraft: {
    type: string;
    tail: string;
    category: string;
    maxPassengers: number;
  };
  price: {
    amount: number;
    currency: string;
  };
  flightDetails: {
    flightTimeMinutes: number;
    distanceNm: number;
  };
  status: 'unanswered' | 'quoted' | 'accepted' | 'declined' | 'expired';
  statusDescription?: string;
  onCopyRfqId?: () => void;
  onCopyQuoteId?: () => void;
}

export function RfqQuoteDetailsCard({
  rfqId,
  quoteId,
  operator,
  aircraft,
  price,
  flightDetails,
  status,
  statusDescription,
  onCopyRfqId,
  onCopyQuoteId,
}: RfqQuoteDetailsCardProps) {
  const formatPrice = (amount: number, currency: string) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const formatFlightTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default';
      case 'quoted':
        return 'secondary';
      case 'unanswered':
        return 'outline';
      case 'declined':
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unanswered':
        return '🟡';
      case 'quoted':
        return '🟢';
      case 'accepted':
        return '✅';
      case 'declined':
        return '❌';
      case 'expired':
        return '⏰';
      default:
        return '📌';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          RFQ & Quote Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* RFQ and Quote IDs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                RFQ ID
              </span>
              <p className="font-mono text-sm font-medium truncate">{rfqId}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyRfqId}
              aria-label="Copy RFQ ID"
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Quote ID
              </span>
              <p className="font-mono text-sm font-medium truncate">{quoteId}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyQuoteId}
              aria-label="Copy Quote ID"
              className="shrink-0"
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>

        <div className="border-t" />

        {/* Operator */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Operator</span>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{operator.name}</span>
              {operator.rating && (
                <div className="flex items-center gap-1">
                  <span>⭐</span>
                  <span className="font-medium">{operator.rating}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Aircraft */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Plane className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Aircraft</span>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="font-medium">{aircraft.type}</p>
            <p className="text-sm text-muted-foreground">Tail: {aircraft.tail}</p>
            <p className="text-sm text-muted-foreground">Category: {aircraft.category}</p>
            <p className="text-sm text-muted-foreground">
              Max Passengers: {aircraft.maxPassengers}
            </p>
          </div>
        </div>

        {/* Price */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Price</span>
          </div>
          <div className="rounded-lg border p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-primary break-words">
              {formatPrice(price.amount, price.currency)}
            </div>
          </div>
        </div>

        {/* Flight Details */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Flight Details</span>
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex flex-wrap justify-between gap-1 text-sm">
              <span className="text-muted-foreground shrink-0">Flight Time</span>
              <span className="font-medium text-right">
                {formatFlightTime(flightDetails.flightTimeMinutes)} ({flightDetails.flightTimeMinutes} min)
              </span>
            </div>
            <div className="flex flex-wrap justify-between gap-1 text-sm">
              <span className="text-muted-foreground shrink-0">Distance</span>
              <span className="font-medium">
                {flightDetails.distanceNm.toLocaleString()} NM
              </span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Status</span>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-1">
              <span>{getStatusIcon(status)}</span>
              <Badge variant={getStatusVariant(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            {statusDescription && (
              <p className="text-sm text-muted-foreground mt-2">{statusDescription}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
