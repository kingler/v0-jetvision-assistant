# TASK-048: Archived REP Inline Chat Integration

**Status**: 🟡 In Progress
**Priority**: Medium
**Estimated Time**: 6-10 hours
**Linear Issue**: [DES-209](https://linear.app/designthru-ai/issue/DES-209)
**Created**: 2025-10-27
**Assigned To**: Development Team

---

## Objective

Remove the separate "Archived Dashboard" page view and integrate archived REP (Request for Proposal) functionality directly into the chat interface. Users should be able to view archived REPs inline within the chat conversation through natural language requests.

---

## Background

### Current State
- Archived dashboard exists at `app/_archived/dashboard/` (not in active routing)
- All JetVision features (search, RFQ, proposals) work within chat
- Archived REPs are not currently accessible through chat
- REPs with terminal status (`completed`, `cancelled`, `failed`) are considered archived

### Problem
- Inconsistent UX: archived viewing would require separate page navigation
- Breaks chat-first user experience
- Adds unnecessary complexity

### Solution
- Integrate archived REP viewing into existing chat interface
- Follow established inline content patterns (workflow, quotes, proposals)
- Enable natural language queries for archived data

---

## Implementation Plan

### Phase 1: Type System & Intents (1-2 hours)

#### 1.1 Update Chat Intent Enum
**File**: `lib/types/chat-agent.ts`

```typescript
export enum ChatIntent {
  // ... existing intents ...

  // Archived RFP Management (NEW)
  LIST_ARCHIVED_RFPS = 'list_archived_rfps',
  VIEW_ARCHIVED_RFP = 'view_archived_rfp',
}
```

#### 1.2 Add Archived REP Response Type
**File**: `lib/types/chat-agent.ts`

```typescript
export enum ChatResponseType {
  // ... existing types ...

  // Archived REP responses (NEW)
  ARCHIVED_RFPS_LIST = 'archived_rfps_list',
  ARCHIVED_RFP_DETAIL = 'archived_rfp_detail',
}
```

#### 1.3 Extend Extracted Entities
**File**: `lib/types/chat-agent.ts`

```typescript
export interface ExtractedEntities {
  // ... existing fields ...

  // Archived REP filters (NEW)
  statusFilter?: ('completed' | 'cancelled' | 'failed')[]
  startDate?: Date
  endDate?: Date
  archivedRfpId?: string
}
```

#### 1.4 Create Archived REP Data Types
**File**: `lib/types/chat-agent.ts`

```typescript
/**
 * Archived REP Summary
 * Lightweight data for list view
 */
export interface ArchivedRFPSummary {
  id: string
  clientName: string
  route: {
    departure: string
    arrival: string
  }
  date: string
  passengers: number
  status: 'completed' | 'cancelled' | 'failed'
  completedAt: string
  duration: number // milliseconds
  selectedOperator?: string
  finalPrice?: number
}

/**
 * Archived REP Detail
 * Complete data for detail view
 */
export interface ArchivedRFPDetail extends ArchivedRFPSummary {
  // Full request data
  request: {
    id: string
    departureAirport: string
    arrivalAirport: string
    departureDate: string
    returnDate: string | null
    passengers: number
    aircraftType: string | null
    budget: number | null
    specialRequirements: string | null
  }

  // Client information
  client: {
    id: string
    name: string
    email: string
    company: string | null
    isVIP: boolean
    preferences?: Record<string, any>
  }

  // Selected quote (if completed)
  selectedQuote?: {
    id: string
    operatorName: string
    aircraftType: string
    basePrice: number
    totalPrice: number
    score: number | null
    ranking: number | null
  }

  // All quotes received
  allQuotes: QuoteData[]

  // Workflow timeline
  workflowHistory: {
    state: string
    enteredAt: string
    duration: number
    agentId: string | null
  }[]

  // Proposal info (if sent)
  proposal?: {
    sentAt: string
    status: 'sent' | 'accepted' | 'rejected'
    recipientEmail: string
  }
}
```

#### 1.5 Update ChatResponseData Interface
**File**: `lib/types/chat-agent.ts`

```typescript
export interface ChatResponseData {
  // ... existing fields ...

  // Archived REP data (NEW)
  archivedRfps?: ArchivedRFPSummary[]
  archivedRfpDetail?: ArchivedRFPDetail
  totalCount?: number
  hasMore?: boolean
}
```

---

### Phase 2: Database Layer (2-3 hours)

#### 2.1 Create Supabase Query Functions
**File**: `lib/services/supabase-queries.ts` (NEW FILE)

```typescript
/**
 * Database Query Functions for Archived REPs
 * Handles all Supabase queries with RLS (Row Level Security)
 */

import { createClient } from '@/lib/supabase/server'
import type { ArchivedRFPSummary, ArchivedRFPDetail } from '@/lib/types/chat-agent'
import type { RequestStatus } from '@/lib/types/database'

/**
 * Archived REP Query Filters
 */
export interface ArchivedRFPFilters {
  statusFilter?: ('completed' | 'cancelled' | 'failed')[]
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

/**
 * Get paginated list of archived REPs for a user
 * @param userId - User ID from Clerk
 * @param filters - Optional filters
 * @returns List of archived REP summaries
 */
export async function getArchivedRFPs(
  userId: string,
  filters: ArchivedRFPFilters = {}
): Promise<{ rfps: ArchivedRFPSummary[]; totalCount: number; hasMore: boolean }> {
  const supabase = await createClient()

  const {
    statusFilter = ['completed', 'cancelled', 'failed'],
    startDate,
    endDate,
    limit = 10,
    offset = 0,
  } = filters

  // Build query
  let query = supabase
    .from('requests')
    .select(`
      id,
      departure_airport,
      arrival_airport,
      departure_date,
      passengers,
      status,
      updated_at,
      created_at,
      client_profiles!inner (
        id,
        contact_name,
        company_name
      ),
      quotes!left (
        id,
        operator_name,
        total_price,
        ranking,
        status
      ),
      workflow_states!inner (
        current_state,
        created_at,
        state_duration_ms
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .in('status', statusFilter as RequestStatus[])
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply date filters
  if (startDate) {
    query = query.gte('updated_at', startDate.toISOString())
  }
  if (endDate) {
    query = query.lte('updated_at', endDate.toISOString())
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[getArchivedRFPs] Error:', error)
    throw new Error(`Failed to fetch archived REPs: ${error.message}`)
  }

  // Transform to ArchivedRFPSummary
  const rfps: ArchivedRFPSummary[] = (data || []).map((row: any) => {
    // Find selected/accepted quote
    const selectedQuote = row.quotes?.find((q: any) =>
      q.status === 'accepted' || q.ranking === 1
    )

    // Calculate total duration
    const totalDuration = row.workflow_states?.reduce(
      (sum: number, ws: any) => sum + (ws.state_duration_ms || 0),
      0
    ) || 0

    return {
      id: row.id,
      clientName: row.client_profiles?.contact_name || row.client_profiles?.company_name || 'Unknown',
      route: {
        departure: row.departure_airport,
        arrival: row.arrival_airport,
      },
      date: row.departure_date,
      passengers: row.passengers,
      status: row.status,
      completedAt: row.updated_at,
      duration: totalDuration,
      selectedOperator: selectedQuote?.operator_name,
      finalPrice: selectedQuote?.total_price,
    }
  })

  return {
    rfps,
    totalCount: count || 0,
    hasMore: (offset + limit) < (count || 0),
  }
}

/**
 * Get complete archived REP details
 * @param rfpId - REP ID
 * @param userId - User ID (for RLS verification)
 * @returns Complete archived REP data
 */
export async function getArchivedRFPDetail(
  rfpId: string,
  userId: string
): Promise<ArchivedRFPDetail> {
  const supabase = await createClient()

  // Fetch request with all related data
  const { data, error } = await supabase
    .from('requests')
    .select(`
      *,
      client_profiles!inner (
        id,
        contact_name,
        company_name,
        email,
        preferences
      ),
      quotes!left (
        id,
        operator_name,
        aircraft_type,
        base_price,
        total_price,
        score,
        ranking,
        status,
        aircraft_details,
        availability_confirmed,
        valid_until
      ),
      workflow_states!inner (
        current_state,
        state_entered_at,
        state_duration_ms,
        agent_id
      )
    `)
    .eq('id', rfpId)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('[getArchivedRFPDetail] Error:', error)
    throw new Error(`Failed to fetch archived REP detail: ${error.message}`)
  }

  if (!data) {
    throw new Error('Archived REP not found')
  }

  // Find selected quote
  const selectedQuote = data.quotes?.find((q: any) =>
    q.status === 'accepted' || q.ranking === 1
  )

  // Sort workflow states chronologically
  const workflowHistory = (data.workflow_states || [])
    .sort((a: any, b: any) =>
      new Date(a.state_entered_at).getTime() - new Date(b.state_entered_at).getTime()
    )
    .map((ws: any) => ({
      state: ws.current_state,
      enteredAt: ws.state_entered_at,
      duration: ws.state_duration_ms,
      agentId: ws.agent_id,
    }))

  // Calculate total duration
  const totalDuration = workflowHistory.reduce(
    (sum: number, ws: any) => sum + (ws.duration || 0),
    0
  )

  // Transform quotes to QuoteData format
  const allQuotes = (data.quotes || []).map((q: any) => ({
    id: q.id,
    operatorName: q.operator_name,
    aircraftType: q.aircraft_type,
    basePrice: q.base_price,
    totalPrice: q.total_price,
    score: q.score,
    ranking: q.ranking,
    status: q.status,
    availabilityConfirmed: q.availability_confirmed,
    validUntil: q.valid_until,
    aircraftDetails: q.aircraft_details,
  }))

  // Build detail object
  const detail: ArchivedRFPDetail = {
    id: data.id,
    clientName: data.client_profiles?.contact_name || data.client_profiles?.company_name || 'Unknown',
    route: {
      departure: data.departure_airport,
      arrival: data.arrival_airport,
    },
    date: data.departure_date,
    passengers: data.passengers,
    status: data.status,
    completedAt: data.updated_at,
    duration: totalDuration,
    selectedOperator: selectedQuote?.operator_name,
    finalPrice: selectedQuote?.total_price,

    request: {
      id: data.id,
      departureAirport: data.departure_airport,
      arrivalAirport: data.arrival_airport,
      departureDate: data.departure_date,
      returnDate: data.return_date,
      passengers: data.passengers,
      aircraftType: data.aircraft_type,
      budget: data.budget,
      specialRequirements: data.special_requirements,
    },

    client: {
      id: data.client_profiles.id,
      name: data.client_profiles.contact_name,
      email: data.client_profiles.email,
      company: data.client_profiles.company_name,
      isVIP: data.client_profiles.preferences?.isVIP || false,
      preferences: data.client_profiles.preferences,
    },

    selectedQuote: selectedQuote ? {
      id: selectedQuote.id,
      operatorName: selectedQuote.operator_name,
      aircraftType: selectedQuote.aircraft_type,
      basePrice: selectedQuote.base_price,
      totalPrice: selectedQuote.total_price,
      score: selectedQuote.score,
      ranking: selectedQuote.ranking,
    } : undefined,

    allQuotes,
    workflowHistory,
  }

  return detail
}
```

---

### Phase 3: Service Layer (2-3 hours)

#### 3.1 Update Chat Agent Service
**File**: `lib/services/chat-agent-service.ts`

Add new handler methods:

```typescript
/**
 * Handle LIST_ARCHIVED_RFPS intent
 * Returns paginated list of archived REPs
 */
private async handleListArchivedRFPs(
  request: ChatAgentRequest
): Promise<ChatAgentResponse> {
  try {
    const { userId, entities } = request

    // Extract filters from entities
    const filters: ArchivedRFPFilters = {
      statusFilter: entities?.statusFilter,
      startDate: entities?.startDate,
      endDate: entities?.endDate,
      limit: 10, // Default page size
    }

    // Query database
    const { rfps, totalCount, hasMore } = await getArchivedRFPs(userId, filters)

    // Generate response message
    let content = ''
    if (rfps.length === 0) {
      content = 'You don\'t have any archived REPs yet. Completed, cancelled, or failed requests will appear here.'
    } else {
      content = `I found ${rfps.length} archived REP${rfps.length !== 1 ? 's' : ''}${totalCount > rfps.length ? ` (showing first ${rfps.length} of ${totalCount})` : ''}.`
    }

    return {
      messageId: request.messageId,
      content,
      intent: ChatIntent.LIST_ARCHIVED_RFPS,
      responseType: ChatResponseType.ARCHIVED_RFPS_LIST,
      data: {
        archivedRfps: rfps,
        totalCount,
        hasMore,
      },
      suggestedActions: rfps.length > 0 ? [
        {
          id: 'view-details',
          label: 'View Details',
          description: 'See full information for a REP',
          action: 'view_archived_rfp_detail',
          icon: '📄',
          intent: ChatIntent.VIEW_ARCHIVED_RFP,
        },
        hasMore ? {
          id: 'load-more',
          label: 'Load More',
          description: 'Show more archived REPs',
          action: 'load_more_archived_rfps',
          icon: '⬇️',
          intent: ChatIntent.LIST_ARCHIVED_RFPS,
          parameters: { offset: rfps.length },
        } : null,
      ].filter(Boolean) : [],
      metadata: {
        processingTime: 0,
      },
    }
  } catch (error) {
    console.error('[handleListArchivedRFPs] Error:', error)

    return {
      messageId: request.messageId,
      content: 'I encountered an error retrieving your archived REPs. Please try again.',
      intent: ChatIntent.LIST_ARCHIVED_RFPS,
      responseType: ChatResponseType.ERROR,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        processingTime: 0,
      },
    }
  }
}

/**
 * Handle VIEW_ARCHIVED_RFP intent
 * Returns complete archived REP details
 */
private async handleViewArchivedRFP(
  request: ChatAgentRequest
): Promise<ChatAgentResponse> {
  try {
    const { userId, entities } = request

    // Get RFP ID from entities
    const rfpId = entities?.archivedRfpId || entities?.rfpId

    if (!rfpId) {
      return {
        messageId: request.messageId,
        content: 'Which archived REP would you like to view? Please provide the REP ID or select from the list.',
        intent: ChatIntent.VIEW_ARCHIVED_RFP,
        responseType: ChatResponseType.CLARIFICATION_NEEDED,
        requiresClarification: true,
        clarificationQuestions: ['Which archived REP would you like to view?'],
        metadata: {
          processingTime: 0,
        },
      }
    }

    // Fetch detail from database
    const detail = await getArchivedRFPDetail(rfpId, userId)

    // Generate response message
    const statusEmoji = {
      completed: '✅',
      cancelled: '❌',
      failed: '⚠️',
    }[detail.status] || '📄'

    const content = `${statusEmoji} Here are the details for your ${detail.status} REP from ${detail.route.departure} to ${detail.route.arrival} on ${new Date(detail.date).toLocaleDateString()}.`

    return {
      messageId: request.messageId,
      content,
      intent: ChatIntent.VIEW_ARCHIVED_RFP,
      responseType: ChatResponseType.ARCHIVED_RFP_DETAIL,
      data: {
        archivedRfpDetail: detail,
      },
      suggestedActions: [
        {
          id: 'view-quotes',
          label: 'See All Quotes',
          description: `View all ${detail.allQuotes.length} quotes received`,
          action: 'show_all_quotes',
          icon: '💰',
          intent: ChatIntent.GET_QUOTES,
          parameters: { rfpId: detail.id },
        },
        {
          id: 'similar-flight',
          label: 'Request Similar Flight',
          description: 'Create new request with same route',
          action: 'create_similar_rfp',
          icon: '✈️',
          intent: ChatIntent.CREATE_RFP,
          parameters: {
            departureAirport: detail.request.departureAirport,
            arrivalAirport: detail.request.arrivalAirport,
            passengers: detail.request.passengers,
            aircraftType: detail.request.aircraftType,
          },
        },
      ],
      metadata: {
        processingTime: 0,
      },
    }
  } catch (error) {
    console.error('[handleViewArchivedRFP] Error:', error)

    return {
      messageId: request.messageId,
      content: 'I couldn\'t find that archived REP. Please check the ID and try again.',
      intent: ChatIntent.VIEW_ARCHIVED_RFP,
      responseType: ChatResponseType.ERROR,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        processingTime: 0,
      },
    }
  }
}
```

Update `classifyIntent` method:

```typescript
/**
 * Classify intent from user message
 * Updated to recognize archived REP queries
 */
async classifyIntent(
  message: string,
  context?: any
): Promise<IntentClassificationResult> {
  const lowerMessage = message.toLowerCase()

  // ... existing intent detection ...

  // Archived REP detection (NEW)
  const archivedKeywords = [
    'archived', 'archive', 'past', 'completed', 'history', 'previous',
    'old request', 'finished', 'cancelled', 'failed'
  ]

  const listKeywords = ['show', 'list', 'view', 'see', 'get', 'display']
  const detailKeywords = ['detail', 'information', 'about', 'specific']

  const hasArchivedKeyword = archivedKeywords.some(kw => lowerMessage.includes(kw))
  const hasListKeyword = listKeywords.some(kw => lowerMessage.includes(kw))
  const hasDetailKeyword = detailKeywords.some(kw => lowerMessage.includes(kw))

  if (hasArchivedKeyword) {
    if (hasDetailKeyword || context?.archivedRfpId) {
      return {
        intent: ChatIntent.VIEW_ARCHIVED_RFP,
        confidence: 0.85,
        entities: await this.extractEntities(message, ChatIntent.VIEW_ARCHIVED_RFP),
      }
    } else if (hasListKeyword) {
      return {
        intent: ChatIntent.LIST_ARCHIVED_RFPS,
        confidence: 0.9,
        entities: await this.extractEntities(message, ChatIntent.LIST_ARCHIVED_RFPS),
      }
    }
  }

  // ... rest of intent detection ...
}
```

Update `routeToAgent` method:

```typescript
/**
 * Route to appropriate agent handler
 * Updated with archived REP handlers
 */
private async routeToAgent(
  intent: IntentClassificationResult,
  request: ChatAgentRequest
): Promise<ChatAgentResponse> {
  // ... existing routing ...

  // Archived REP routing (NEW)
  case ChatIntent.LIST_ARCHIVED_RFPS:
    return this.handleListArchivedRFPs(request)

  case ChatIntent.VIEW_ARCHIVED_RFP:
    return this.handleViewArchivedRFP(request)

  // ... rest of routing ...
}
```

---

### Phase 4: UI Components (2-3 hours)

#### 4.1 Create Archived REP Display Component
**File**: `components/archived-rep-display.tsx` (NEW FILE)

```typescript
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
                          <p className="font-semibold">${quote.totalPrice.toLocaleString()}</p>
                          {quote.ranking && (
                            <Badge variant="outline" size="sm">#{quote.ranking}</Badge>
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
```

#### 4.2 Update Chat Interface
**File**: `components/chat-interface.tsx`

Add new message flags and rendering logic:

```typescript
// Add to ChatMessage interface
export interface ChatMessage {
  // ... existing fields ...

  // NEW: Archived REP display flags
  showArchivedRFPsList?: boolean
  showArchivedRFPDetail?: boolean
}

// In the message rendering section, add:
{message.showArchivedRFPsList && message.data?.archivedRfps && (
  <div className="mt-3">
    <ArchivedREPDisplay
      mode="list"
      data={message.data.archivedRfps}
      onViewDetail={(rfpId) => {
        // Send message to view detail
        handleSendMessage(`View details for REP ${rfpId}`, {
          intent: ChatIntent.VIEW_ARCHIVED_RFP,
          entities: { archivedRfpId: rfpId },
        })
      }}
    />
  </div>
)}

{message.showArchivedRFPDetail && message.data?.archivedRfpDetail && (
  <div className="mt-3">
    <ArchivedREPDisplay
      mode="detail"
      data={message.data.archivedRfpDetail}
    />
  </div>
)}
```

---

### Phase 5: API Integration (1-2 hours)

#### 5.1 Update Chat API Route
**File**: `app/api/chat/respond/route.ts`

Add tool definitions:

```typescript
const tools = [
  // ... existing tools ...

  // NEW: List archived REPs
  {
    type: 'function',
    function: {
      name: 'list_archived_rfps',
      description: 'List archived REPs (completed, cancelled, or failed requests)',
      parameters: {
        type: 'object',
        properties: {
          statusFilter: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['completed', 'cancelled', 'failed'],
            },
            description: 'Filter by status (default: all archived statuses)',
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Filter REPs completed after this date',
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'Filter REPs completed before this date',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of REPs to return (default: 10)',
          },
        },
      },
    },
  },

  // NEW: Get archived REP detail
  {
    type: 'function',
    function: {
      name: 'get_archived_rfp_detail',
      description: 'Get complete details for a specific archived REP',
      parameters: {
        type: 'object',
        properties: {
          rfpId: {
            type: 'string',
            description: 'The REP ID to retrieve',
          },
        },
        required: ['rfpId'],
      },
    },
  },
]
```

Update system prompt:

```typescript
const systemPrompt = `You are JetVision AI Assistant...

... existing capabilities ...

**Archived REPs:**
- Users can view past completed, cancelled, or failed requests
- Use list_archived_rfps to show archived REPs
- Use get_archived_rfp_detail to show full REP information
- Example queries: "Show my past flights", "What happened with my LAX request?"

...`
```

---

### Phase 6: Testing (1-2 hours)

#### 6.1 Unit Tests
**File**: `__tests__/unit/lib/services/chat-agent-service.test.ts`

Add tests for new methods (to be written)

#### 6.2 Integration Tests
**File**: `__tests__/integration/archived-rep.integration.test.ts` (NEW)

Add full integration tests (to be written)

#### 6.3 Component Tests
**File**: `__tests__/unit/components/archived-rep-display.test.tsx` (NEW)

Add component tests (to be written)

---

### Phase 7: Documentation (1 hour)

- Update `CLAUDE.md` with archived REP patterns
- Update `CHANGELOG.md`
- Update archived dashboard README
- Add JSDoc comments

---

## Testing Checklist

- [ ] Unit tests for `getArchivedRFPs()`
- [ ] Unit tests for `getArchivedRFPDetail()`
- [ ] Unit tests for `handleListArchivedRFPs()`
- [ ] Unit tests for `handleViewArchivedRFP()`
- [ ] Integration test: List archived REPs
- [ ] Integration test: View archived REP detail
- [ ] Component test: ArchivedREPListView renders correctly
- [ ] Component test: ArchivedREPDetailView renders correctly
- [ ] E2E test: User asks for archived REPs → sees list
- [ ] E2E test: User clicks "View Details" → sees detail
- [ ] Test with 0 archived REPs
- [ ] Test with multiple archived REPs
- [ ] Test with different statuses (completed/cancelled/failed)
- [ ] Test date filtering
- [ ] Test pagination (hasMore)
- [ ] Verify RLS (user can't access other user's REPs)
- [ ] Verify ≥75% code coverage

---

## Acceptance Criteria

✅ Users can request archived REPs through natural language
✅ Chat classifies "show past flights" as LIST_ARCHIVED_RFPS intent
✅ Archived REPs display inline with status badges
✅ List view shows summaries (10 per page)
✅ Detail view shows complete REP information
✅ Detail view includes workflow timeline
✅ Detail view shows all received quotes
✅ "View Details" button works correctly
✅ Suggested actions appear (load more, view detail, similar flight)
✅ No separate dashboard page needed
✅ All tests pass
✅ Code coverage ≥75%
✅ Response time <500ms for list, <1s for detail
✅ Works on mobile and desktop
✅ Pre-commit hooks pass

---

## Dependencies

### External Services
- Supabase PostgreSQL database
- Row Level Security (RLS) policies active

### Internal Dependencies
- `lib/types/chat-agent.ts` - Type definitions
- `lib/services/chat-agent-service.ts` - Chat service
- `components/chat-interface.tsx` - Chat UI
- `app/api/chat/respond/route.ts` - Chat API

### Component Dependencies
- `@/components/ui/badge` - shadcn/ui Badge
- `@/components/ui/card` - shadcn/ui Card
- `@/components/ui/button` - shadcn/ui Button
- `lucide-react` - Icons

---

## Migration Notes

### No Breaking Changes
- Additive feature only
- No existing functionality affected
- Dashboard code remains in `app/_archived/dashboard/`

### Database Performance
- Add composite index for archived REP queries:
  ```sql
  CREATE INDEX idx_requests_user_status_updated
  ON requests(user_id, status, updated_at DESC)
  WHERE status IN ('completed', 'cancelled', 'failed');
  ```

### Environment Variables
- No new environment variables needed

---

## Rollback Plan

If issues arise:

1. **Remove new intents** from `ChatIntent` enum
2. **Comment out handlers** in `chat-agent-service.ts`
3. **Remove tool definitions** from API route
4. **Hide UI components** (don't delete files)
5. **Revert** to previous commit if necessary

All code is additive and can be safely disabled.

---

## Future Enhancements

### v1.1 (Future)
- [ ] Date range picker UI for filtering
- [ ] Export archived REPs to CSV/PDF
- [ ] Archive search by client name
- [ ] Archive search by route
- [ ] Comparison view (compare 2+ archived REPs)

### v1.2 (Future)
- [ ] Archive analytics dashboard (completion rates, avg duration)
- [ ] Archive tags/labels
- [ ] Archive notes (add notes to archived REPs)

---

## Success Metrics

### Technical Metrics
- Response time: <500ms for list, <1s for detail
- Code coverage: ≥75%
- Zero TypeScript errors
- All tests passing

### User Experience Metrics
- Users can find archived REPs in <2 clicks
- Detail view loads in <1 second
- Mobile experience is smooth

---

## Related Files

### New Files (3)
- `components/archived-rep-display.tsx`
- `lib/services/supabase-queries.ts`
- `tasks/backlog/TASK-048-archived-rep-inline-chat-integration.md`

### Modified Files (6)
- `lib/types/chat-agent.ts`
- `lib/services/chat-agent-service.ts`
- `components/chat-interface.tsx`
- `app/api/chat/respond/route.ts`
- `app/_archived/dashboard/README.md`
- `CHANGELOG.md`

### Test Files (3)
- `__tests__/unit/lib/services/chat-agent-service.test.ts`
- `__tests__/integration/archived-rep.integration.test.ts`
- `__tests__/unit/components/archived-rep-display.test.tsx`

---

## Completion Checklist

- [ ] All code written and tested
- [ ] All tests passing
- [ ] Code coverage ≥75%
- [ ] Documentation updated
- [ ] Pre-commit hooks pass
- [ ] Linear issue updated
- [ ] PR created with morpheus-validator review
- [ ] Code review completed
- [ ] Merged to main

---

**Task Created**: 2025-10-27
**Linear Issue**: [DES-209](https://linear.app/designthru-ai/issue/DES-209)
**Estimated Completion**: 6-10 hours
