/**
 * Proposal Preview Component
 *
 * Displays a preview of a flight proposal with key details
 * and actions (download, view, accept).
 * Supports one-way, round-trip, and multi-city trip types.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, CheckCircle, Plane, Calendar, Users } from 'lucide-react';
import { ProposalPreviewComponent } from './types';

export interface ProposalPreviewProps {
  proposal: ProposalPreviewComponent['proposal'];
  onDownload?: (proposalId: string) => void;
  onView?: (proposalId: string) => void;
  onAccept?: (proposalId: string) => void;
  className?: string;
}

/**
 * Get trip type display label
 */
function getTripTypeLabel(tripType?: string): string | null {
  switch (tripType) {
    case 'round_trip': return 'Round-Trip';
    case 'multi_city': return 'Multi-City';
    default: return null;
  }
}

export function ProposalPreview({ proposal, onDownload, onView, onAccept, className }: ProposalPreviewProps) {
  const { id, title, flightDetails, selectedQuote, summary } = proposal;
  const tripType = flightDetails.tripType;
  const tripLabel = getTripTypeLabel(tripType);

  return (
    <Card className={`${className || ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>
              Proposal ready for your review
            </CardDescription>
          </div>
          {tripLabel && (
            <Badge variant="outline" className="text-xs shrink-0">
              {tripLabel}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Flight Details */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm">Flight Details</h4>

          {/* Multi-city segments */}
          {tripType === 'multi_city' && flightDetails.segments && flightDetails.segments.length > 0 ? (
            <div className="space-y-2">
              {flightDetails.segments.map((seg, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-muted-foreground font-medium w-12 shrink-0">
                    Leg {i + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{seg.departureAirport} → {seg.arrivalAirport}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{seg.date}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Passengers</p>
                  <p className="font-medium">{flightDetails.passengers}</p>
                </div>
              </div>
            </div>
          ) : (
            // One-way / round-trip: standard grid
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Route</p>
                  <p className="font-medium">
                    {tripType === 'round_trip'
                      ? flightDetails.route.replace('→', '⇄')
                      : flightDetails.route}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">
                    {tripType === 'round_trip' ? 'Outbound' : 'Date'}
                  </p>
                  <p className="font-medium">{flightDetails.date}</p>
                  {tripType === 'round_trip' && flightDetails.returnDate && (
                    <>
                      <p className="text-muted-foreground mt-1">Return</p>
                      <p className="font-medium">{flightDetails.returnDate}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Passengers</p>
                  <p className="font-medium">{flightDetails.passengers}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Quote */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Selected Quote</h4>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{selectedQuote.operatorName}</p>
              <p className="text-sm text-muted-foreground">{selectedQuote.aircraftType}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">
                ${selectedQuote.price.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="text-sm text-muted-foreground">
            <p>{summary}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(id)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Full Proposal
            </Button>
          )}
          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(id)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
          {onAccept && (
            <Button
              size="sm"
              onClick={() => onAccept(id)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Accept Proposal
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
