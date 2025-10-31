/**
 * Archived REP Display Component
 * Renders archived REPs inline in chat
 */

'use client'

import React, { useState } from 'react'
import type { ArchivedRFPSummary, ArchivedRFPDetail } from '@/lib/types/chat-agent'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Users,
  Plane,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface ArchivedREPDisplayProps {
  mode: 'list' | 'detail'
  data: ArchivedRFPSummary[] | ArchivedRFPDetail
  onViewDetail?: (rfpId: string) => void
}

export function ArchivedREPDisplay({ mode, data, onViewDetail }: ArchivedREPDisplayProps) {
  if (mode === 'list') {
    return <ArchivedREPListView rfps={data as ArchivedRFPSummary[]} onViewDetail={onViewDetail} />
  } else {
    return <ArchivedREPDetailView detail={data as ArchivedRFPDetail} />
  }
}

/**
 * List View Component
 * Shows card-based summaries
 */
function ArchivedREPListView({
  rfps,
  onViewDetail
}: {
  rfps: ArchivedRFPSummary[]
  onViewDetail?: (rfpId: string) => void
}) {
  if (rfps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No archived REPs found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rfps.map((rfp) => (
        <Card key={rfp.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              {/* Left: Main Info */}
              <div className="flex-1">
                {/* Route */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-lg">
                    {rfp.route.departure} → {rfp.route.arrival}
                  </span>
                  <StatusBadge status={rfp.status} />
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(rfp.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {rfp.passengers} passenger{rfp.passengers !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(rfp.duration)}
                  </div>
                </div>

                {/* Client */}
                <p className="text-sm mt-2">Client: {rfp.clientName}</p>

                {/* Selected Operator (if completed) */}
                {rfp.status === 'completed' && rfp.selectedOperator && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Badge variant="secondary">Selected: {rfp.selectedOperator}</Badge>
                    {rfp.finalPrice && (
                      <span className="flex items-center gap-1 font-semibold text-green-600">
                        <DollarSign className="h-4 w-4" />
                        {rfp.finalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Action Button */}
              {onViewDetail && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetail(rfp.id)}
                  className="ml-4"
                >
                  View Details
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Detail View Component
 * Shows complete REP information
 */
function ArchivedREPDetailView({ detail }: { detail: ArchivedRFPDetail }) {
  const [showQuotes, setShowQuotes] = useState(false)
  const [showWorkflow, setShowWorkflow] = useState(false)

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              {detail.route.departure} → {detail.route.arrival}
              <StatusBadge status={detail.status} />
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow
              icon={<Calendar className="h-5 w-5" />}
              label="Departure Date"
              value={new Date(detail.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            />
            <InfoRow
              icon={<Users className="h-5 w-5" />}
              label="Passengers"
              value={`${detail.passengers} passenger${detail.passengers !== 1 ? 's' : ''}`}
            />
            <InfoRow
              icon={<Clock className="h-5 w-5" />}
              label="Completed"
              value={new Date(detail.completedAt).toLocaleDateString()}
            />
            <InfoRow
              icon={<Clock className="h-5 w-5" />}
              label="Processing Time"
              value={formatDuration(detail.duration)}
            />
          </div>

          {/* Client Info */}
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-2">Client Information</h4>
            <p className="text-sm">
              <span className="font-medium">{detail.client.name}</span>
              {detail.client.isVIP && (
                <Badge variant="secondary" className="ml-2">VIP</Badge>
              )}
            </p>
            <p className="text-sm text-muted-foreground">{detail.client.email}</p>
            {detail.client.company && (
              <p className="text-sm text-muted-foreground">{detail.client.company}</p>
            )}
          </div>

          {/* Selected Quote (if completed) */}
          {detail.status === 'completed' && detail.selectedQuote && (
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Selected Operator</h4>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">{detail.selectedQuote.operatorName}</span>
                  <Badge variant="default">Selected</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Aircraft:</span>
                    <span className="ml-2 font-medium">{detail.selectedQuote.aircraftType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Price:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      ${detail.selectedQuote.totalPrice.toLocaleString()}
                    </span>
                  </div>
                  {detail.selectedQuote.score && (
                    <div>
                      <span className="text-muted-foreground">AI Score:</span>
                      <span className="ml-2 font-medium">{detail.selectedQuote.score}/100</span>
                    </div>
                  )}
                  {detail.selectedQuote.ranking && (
                    <div>
                      <span className="text-muted-foreground">Ranking:</span>
                      <span className="ml-2 font-medium">#{detail.selectedQuote.ranking}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* All Quotes Toggle */}
          {detail.allQuotes.length > 0 && (
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => setShowQuotes(!showQuotes)}
                className="w-full justify-between"
              >
                <span className="font-semibold">
                  All Quotes Received ({detail.allQuotes.length})
                </span>
                {showQuotes ? <ChevronUp /> : <ChevronDown />}
              </Button>

              {showQuotes && (
                <div className="mt-3 space-y-2">
                  {detail.allQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="border rounded-lg p-3 text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{quote.operatorName}</p>
                          <p className="text-muted-foreground">{quote.aircraftType}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${quote.price.toLocaleString()}</p>
                          {quote.rank > 0 && (
                            <Badge variant="outline" className="text-xs">#{quote.rank}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Workflow Timeline Toggle */}
          {detail.workflowHistory.length > 0 && (
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => setShowWorkflow(!showWorkflow)}
                className="w-full justify-between"
              >
                <span className="font-semibold">
                  Workflow Timeline ({detail.workflowHistory.length} steps)
                </span>
                {showWorkflow ? <ChevronUp /> : <ChevronDown />}
              </Button>

              {showWorkflow && (
                <div className="mt-3 space-y-3">
                  {detail.workflowHistory.map((step, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        {index < detail.workflowHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-blue-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium">{formatWorkflowState(step.state)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(step.enteredAt).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Duration: {formatDuration(step.duration)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Proposal Info (if sent) */}
          {detail.proposal && (
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Proposal</h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="secondary" className="ml-2">
                    {detail.proposal.status}
                  </Badge>
                </p>
                <p>
                  <span className="text-muted-foreground">Sent to:</span>
                  <span className="ml-2">{detail.proposal.recipientEmail}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Sent at:</span>
                  <span className="ml-2">
                    {new Date(detail.proposal.sentAt).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: 'completed' | 'cancelled' | 'failed' }) {
  const config = {
    completed: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: 'Completed',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 border-green-200',
    },
    cancelled: {
      icon: <XCircle className="h-4 w-4" />,
      label: 'Cancelled',
      variant: 'secondary' as const,
      className: 'bg-gray-100 text-gray-800 border-gray-200',
    },
    failed: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Failed',
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 border-red-200',
    },
  }[status]

  return (
    <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
      {config.icon}
      {config.label}
    </Badge>
  )
}

/**
 * Info Row Component
 */
function InfoRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

/**
 * Format duration from milliseconds to human-readable
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Format workflow state to human-readable
 */
function formatWorkflowState(state: string): string {
  const stateLabels: Record<string, string> = {
    analyzing: 'Analyzing Request',
    fetching_client_data: 'Fetching Client Data',
    searching_flights: 'Searching Flights',
    awaiting_quotes: 'Awaiting Quotes',
    analyzing_proposals: 'Analyzing Proposals',
    generating_email: 'Generating Email',
    sending_proposal: 'Sending Proposal',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  }

  return stateLabels[state] || state
}
